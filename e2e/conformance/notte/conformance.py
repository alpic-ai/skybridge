# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "playwright>=1.48",
#     "pydantic>=2",
#     "notte-sdk",
#     "python-dotenv>=1",
# ]
# ///
"""
Drive the Skybridge hooks conformance app end-to-end on a real host with plain
Playwright (sync API). This is the entry point: it owns the stepper loop, the
browser backends, the baseline gate, and the CLI. Host-specific behavior lives
in chatgpt.py / claude.py; shared helpers and models live in utils.py.

Sends a single "run @{app_name}" (ChatGPT) / "run {app_name}" (Claude)
prompt, then drives the in-widget stepper like a real tester would: clicks
Run on each action test, verifies the side effects it can observe from
outside the widget (modal, follow-up message, native dialogs) to answer the
app's Yes/No confirmations honestly, skips the ones it cannot observe,
extracts the results table, and presses Close last.

Two browser backends are supported:

  - `--mode local`: a persistent Chrome profile on this machine. You log in
    once by hand; the profile is reused on every run.
  - `--mode notte`: a Notte-hosted cloud browser, connected to via Chrome
    DevTools Protocol (CDP) so this script can drive it with plain
    Playwright. This is the CI path: no display to launch Chrome on, and the
    login persists in the Notte profile.

Usage:
    uv run notte/conformance.py --host chatgpt --mode local
    uv run notte/conformance.py --host chatgpt --mode notte --profile-id notte-profile-...
    uv run notte/conformance.py --host claude --mode local

See the README's E2E section for setup (connecting the app, creating a
profile).
"""

import argparse
import json
import os
import sys
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from dotenv import load_dotenv
from playwright.sync_api import BrowserContext, Page, sync_playwright
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from chatgpt import CHATGPT
from claude import CLAUDE
from utils import (
    MAX_LOOP_TURNS,
    STEPPER_DEADLINE_S,
    HostConfig,
    ResultRow,
    StallError,
    _PENDING,
    close_host_modal,
    dismiss_host_overlay,
    drive_widget,
    install_state_listener,
    read_state,
    rows_complete,
    take_screenshot,
    wait_for_widget,
    widget_present,
)

HOSTS: dict[str, HostConfig] = {CHATGPT.name: CHATGPT, CLAUDE.name: CLAUDE}


# ── Answering confirmations ──────────────────────────────────────────


def answer_confirm(
    page: Page,
    selector: str,
    host: HostConfig,
    hook: str,
    verified_effects: dict[str, bool],
    unverifiable: frozenset[str],
) -> None:
    """Answer the app's Yes/No confirmation by verifying the effect from outside.

    Effects the browser cannot observe (e.g. a file landing on disk) are
    skipped rather than guessed, so the report stays honest.
    """
    if hook in unverifiable:
        print(f"[conformance] '{hook}' is not observable in this mode, skipping", flush=True)
        drive_widget(page, selector, "skip")
        return
    hook_lc = hook.lower()
    if hook in verified_effects:
        # A host-native permission dialog already settled this after Run: the
        # "Open link" / "Download" dialog both hosts pop, or Claude's in-widget
        # modal. openExternal lives here now (both hosts pop the link dialog),
        # so there's no new-tab guessing to do.
        verified = verified_effects[hook]
    elif "requestmodal" in hook_lc:
        # On Apps SDK (ChatGPT) the modal is a no-op: the host mounts a modal
        # view instance that misdetects its runtime and broadcasts modal_open
        # even though nothing usable renders (a documented false positive), so
        # it never counts as support — the manual baseline is unsupported. Just
        # dismiss any host overlay so its backdrop can't block later tests.
        # (Claude's real in-widget modal is handled above via verified_effects.)
        verified = False
        dismiss_host_overlay(page)
    elif "sendfollowupmessage" in hook_lc:
        verified = host.check_follow_up(page)
    else:
        print(f"[conformance] cannot verify '{hook}' from outside, skipping", flush=True)
        drive_widget(page, selector, "skip")
        return
    drive_widget(page, selector, "yes" if verified else "no")


# ── The stepper loop ─────────────────────────────────────────────────


def finalize_close(page: Page, selector: str, rows: list[ResultRow]) -> list[ResultRow]:
    """Resolve the useRequestClose row after driving Close.

    The app records a verdict only when the close FAILS (it waits 2s, then
    broadcasts the row); a granted close dismisses the view before anything
    can be recorded, leaving the last broadcast frozen at "testing". The
    driver is the one who can observe the dismissal, so it fills the verdict
    in on the app's behalf.
    """
    time.sleep(8)  # app-side failure verdict lands ~2s after the request
    try:
        state = read_state(page, timeout_seconds=4, poll_interval=2)
        if state.rows:
            rows = state.rows
    except TimeoutError:
        pass  # no broadcast at all — treat like a dismissed widget below
    dismissed = not widget_present(page, selector)
    for row in rows:
        if row.hook == "useRequestClose" and row.result.strip() in ("", "testing", "testing…"):
            row.result = "supported" if dismissed else "unsupported"
            row.detail = (
                "the host dismissed the view (verified by the driver)"
                if dismissed
                else "the view is still visible after requestClose"
            )
    return rows


def drive_stepper(
    page: Page, host: HostConfig, unverifiable: frozenset[str]
) -> tuple[list[ResultRow], bytes | None]:
    host.hide_sidebar(page)
    host.dismiss_modal(page)
    install_state_listener(page)

    rows: list[ResultRow] = []
    verified_effects: dict[str, bool] = {}
    deadline = time.time() + STEPPER_DEADLINE_S
    selector = host.widget_iframe_selector
    # Stall guard: if the same hook keeps offering Run while no new verdict
    # lands, the test isn't advancing (see StallError) — bail for a fresh retry
    # instead of burning every turn on it.
    stall_hook: str | None = None
    stall_resolved = -1
    stall_clicks = 0
    STALL_LIMIT = 6

    for turn in range(MAX_LOOP_TURNS):
        if time.time() > deadline:
            print("[conformance] stepper deadline reached", flush=True)
            break

        # Keep the tab foregrounded: a backgrounded tab throttles timers, which
        # stalls the 60s useRegisterViewTool wait and slows setDisplayMode's
        # fullscreen grant enough to trip the stall guard.
        try:
            page.bring_to_front()
        except Exception:
            pass

        state = read_state(page)
        if state.rows:
            rows = state.rows
        print(
            f"[conformance] turn={turn} hook={state.current_hook} "
            f"button={state.action_button} confirm={bool(state.confirm_question)} "
            f"modal={state.modal_open} complete={state.run_complete}",
            flush=True,
        )

        if state.modal_open:
            # Only ChatGPT's Apps SDK ever broadcasts this, and it's a false
            # positive (a mounted modal-view instance that misdetects its
            # runtime; nothing usable renders). Don't count it as support —
            # just dismiss the overlay so it can't block later tests.
            close_host_modal(page, selector)
            continue

        if state.run_complete:
            break

        if state.confirm_question:
            answer_confirm(
                page, selector, host, state.current_hook or "", verified_effects, unverifiable
            )
            continue

        if state.action_button:
            is_close = state.action_button.strip().lower() == "close"
            if is_close:
                # Capture the fully-filled table BEFORE asking the host to
                # dismiss the view — a granted close leaves nothing to shoot.
                screenshot = take_screenshot(page, selector)
                drive_widget(page, selector, "run", label=state.action_button.strip())
                rows = finalize_close(page, selector, rows)
                return rows, screenshot
            hook = state.current_hook or ""
            resolved = sum(1 for r in rows if r.result.strip() not in _PENDING)
            if hook == stall_hook and resolved == stall_resolved:
                stall_clicks += 1
                if stall_clicks >= STALL_LIMIT:
                    raise StallError(f"{hook} never advanced after {stall_clicks} Run clicks")
            else:
                stall_hook, stall_resolved, stall_clicks = hook, resolved, 0
            drive_widget(page, selector, "run", label=state.action_button.strip())
            if host.accept_native_dialog:
                # Some hooks' effects are gated behind a host permission dialog
                # (Open link / Download) that appears right after Run and blocks
                # every later click until answered.
                result = host.accept_native_dialog(page, hook)
                if result is not None:
                    verified_effects[hook] = result
                    print(f"[conformance] native dialog for {hook}: {result}", flush=True)
            if "displaymode" in hook.lower():
                # The fullscreen test no longer restores itself, and a
                # fullscreen widget hides the conversation DOM that later
                # checks rely on; restore through the app's own API.
                time.sleep(4)
                drive_widget(page, selector, "restore-inline")
            time.sleep(6)
            continue

        # Automatic tests still running
        time.sleep(4)

    return rows, take_screenshot(page, selector)


def run_conformance(
    host: HostConfig,
    page: Page,
    app_name: str,
    unverifiable: frozenset[str],
) -> dict[str, Any]:
    rows: list[ResultRow] = []
    screenshot_bytes: bytes | None = None

    # Real hosts are flaky: the widget handshake can yield a blank iframe that
    # never broadcasts state, and a test can stall (ChatGPT remounts the iframe
    # on fullscreen, dropping the displayMode probe). A fresh conversation clears
    # both, so retry the whole run until every verdict lands or attempts run out.
    ATTEMPTS = 4
    try:
        for attempt in range(ATTEMPTS):
            page.goto(host.url)
            time.sleep(5)  # SPA hydration
            try:
                host.send_prompt(page, app_name)
                wait_for_widget(page, host.widget_iframe_selector)
                time.sleep(12)  # let the app's automatic tests record
                # Early capture, replaced by the pre-close one when the run gets there.
                screenshot_bytes = take_screenshot(page, host.widget_iframe_selector) or screenshot_bytes
                rows, final_screenshot = drive_stepper(page, host, unverifiable)
                screenshot_bytes = final_screenshot or screenshot_bytes
            except (TimeoutError, PlaywrightTimeoutError, StallError) as exc:
                # PlaywrightTimeoutError is a separate class from the builtin, so
                # catch both: a Cloudflare-blocked composer (Page.fill timeout)
                # should retry in a fresh conversation, not fall straight through.
                print(f"[conformance] attempt {attempt + 1} aborted: {str(exc).splitlines()[0]}", flush=True)
                continue
            if rows_complete(rows):
                break
            print(
                f"[conformance] attempt {attempt + 1} incomplete "
                f"({sum(1 for r in rows if r.result.strip() in _PENDING)} rows unresolved)",
                flush=True,
            )
    except Exception as exc:
        # Swallow rather than propagate: a partial run (whatever rows got
        # broadcast before things went wrong) is more useful than nothing, and
        # the caller still gets a real result to write out and compare.
        print(f"[conformance] stepper run failed: {exc}", flush=True)
        if screenshot_bytes is None:
            try:
                screenshot_bytes = page.screenshot()  # what the page showed when it failed
            except Exception:
                pass

    counts: dict[str, int] = {}
    for row in rows:
        verdict = row.result.strip().lower() or "untested"
        counts[verdict] = counts.get(verdict, 0) + 1

    return {
        "app_name": app_name,
        "rows": rows,
        "counts": counts,
        "screenshot_bytes": screenshot_bytes,
    }


# ── Browser backends ─────────────────────────────────────────────────


@contextmanager
def local_browser(profile_dir: Path) -> Iterator[BrowserContext]:
    """A persistent local Chrome profile, driven directly (no CDP hop).

    headless MUST stay off: headless Chromium drops cross-origin
    MessagePort transfers, which breaks the widget init handshake.
    """
    with sync_playwright() as playwright:
        context = playwright.chromium.launch_persistent_context(
            str(profile_dir),
            channel="chrome",
            headless=False,
            viewport={"width": 1440, "height": 1400},
            # navigator.webdriver=true trips the hosts' bot detection
            # (Cloudflare on auth.openai.com); this is our own test account.
            # Popup blocking must be off so the openExternal tab isn't eaten.
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-popup-blocking",
            ],
        )
        try:
            yield context
        finally:
            context.close()


@contextmanager
def notte_browser(profile_id: str) -> Iterator[BrowserContext]:
    """A Notte-hosted cloud browser, connected to via CDP.

    Verified against docs.notte.cc (features/sessions/playwright): a
    RemoteSession exposes `cdp_url()`, and `playwright.chromium.connect_over_cdp`
    attaches to it directly; Notte sessions have exactly one context with one
    page, so there is nothing to create here.
    """
    from notte_sdk import NotteClient  # imported lazily: only needed in notte mode

    client = NotteClient()
    with client.Session(
        profile={"id": profile_id, "persist": True},
        headless=False,  # headless Chromium drops cross-origin MessagePort transfers, breaking the widget init handshake
        # Tall viewport so the stepper card AND the results table fit on
        # screen; the driver can only click what is visible.
        viewport_width=1440,
        viewport_height=1400,
        # Real clicks over remote CDP cost ~7s each (round-trip actionability
        # checks), so a full run plus a retry needs well over the 15min default.
        max_duration_minutes=30,
        # We drive via Playwright-over-CDP, not Notte's action API, so Notte
        # sees fewer "actions" and would reap the session at its 3min idle
        # default during long waits (the 60s useRegisterViewTool timeout, the
        # ~2min follow-up poll). 15 is the max Notte allows.
        idle_timeout_minutes=15,
        # Cloudflare (in front of the hosts) challenges Notte's datacenter IPs;
        # let Notte solve the challenge when it appears. Residential proxies
        # would dodge the challenge entirely but break the widget: its app JS
        # loads from the tunnel, which the proxy can't reach (every run aborted
        # with "no state"). So solver on, proxies off.
        solve_captchas=True,
    ) as session:
        cdp_url = session.cdp_url()
        with sync_playwright() as playwright:
            browser = playwright.chromium.connect_over_cdp(cdp_url)
            context = browser.contexts[0]
            yield context


# ── Baseline comparison ──────────────────────────────────────────────


def compare(
    rows: list[ResultRow], expected: dict[str, str], ignore: frozenset[str] = frozenset()
) -> list[str]:
    """Compare each hook's verdict against the baseline.

    Hooks in `ignore` are not gated: their effect can't be witnessed in this
    mode (see UNVERIFIABLE_BY_MODE), so the driver skips them rather than
    assert a verdict it can't verify.
    """
    actual = {row.hook: row.result.strip().lower() for row in rows}
    mismatches: list[str] = []
    for hook, want in expected.items():
        if hook in ignore:
            continue
        got = actual.get(hook, "missing")
        if got != want:
            mismatches.append(f"{hook}: expected '{want}', got '{got}'")
    for hook in actual:
        if hook not in expected and hook not in ignore:
            mismatches.append(f"{hook}: not in the expected baseline")
    return mismatches


# Hooks whose effect can't be witnessed in a given mode, so the driver skips
# them and doesn't gate on them. Currently empty: openExternal used to be here
# (its ChatGPT new tab never surfaced over Notte's CDP), but both hosts now pop
# an observable "Open link" dialog that accept_native_dialog accepts, so it's
# verifiable everywhere. Kept as the seam for any hook that becomes unobservable.
UNVERIFIABLE_BY_MODE: dict[str, frozenset[str]] = {}


# ── CLI ───────────────────────────────────────────────────────────────


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Drive the Skybridge hooks conformance app end-to-end via Playwright.",
    )
    parser.add_argument("--host", required=True, choices=sorted(HOSTS), help="which host to drive")
    parser.add_argument("--mode", choices=["local", "notte"], default="local", help="browser backend")
    parser.add_argument(
        "--profile-dir",
        type=Path,
        default=None,
        help="local mode: persistent Chrome profile dir (default: <script_dir>/.profiles/local)",
    )
    parser.add_argument(
        "--profile-id",
        default=os.environ.get("NOTTE_PROFILE_ID"),
        help="notte mode: Notte profile id (default: env NOTTE_PROFILE_ID)",
    )
    parser.add_argument("--app-name", default="Conformance", help="the connected app's display name")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="output dir for results.json/screenshot.png (default: <script_dir>/out/<host>)",
    )
    parser.add_argument(
        "--expected",
        default=None,
        help="baseline JSON to compare against (default: <script_dir>/<host>_expected.json; pass '' to skip)",
    )
    args = parser.parse_args(argv)

    if args.profile_dir is None:
        args.profile_dir = script_dir / ".profiles" / "local"
    if args.out is None:
        args.out = script_dir / "out" / args.host
    if args.expected is None:
        args.expected = str(script_dir / f"{args.host}_expected.json")
    return args


def main(argv: list[str] | None = None) -> int:
    # Load the example's .env (NOTTE_API_KEY / NOTTE_PROFILE_ID) before args are
    # parsed, so the --profile-id default and NotteClient both see it. override
    # is False by default, so CI's real env vars win over the file.
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    args = parse_args(argv)
    host = HOSTS[args.host]
    unverifiable = UNVERIFIABLE_BY_MODE.get(args.mode, frozenset())

    if args.mode == "notte" and not args.profile_id:
        print("--profile-id is required in notte mode (flag or NOTTE_PROFILE_ID env)", file=sys.stderr)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)

    rows: list[ResultRow] = []
    counts: dict[str, int] = {}
    screenshot_bytes: bytes | None = None
    run_failed = False

    browser_cm = (
        local_browser(args.profile_dir)
        if args.mode == "local"
        else notte_browser(args.profile_id)
    )
    if args.mode == "local":
        args.profile_dir.mkdir(parents=True, exist_ok=True)

    try:
        with browser_cm as context:
            page = context.pages[0] if context.pages else context.new_page()
            result = run_conformance(host, page, args.app_name, unverifiable)
            rows = result["rows"]
            counts = result["counts"]
            screenshot_bytes = result["screenshot_bytes"]
    except Exception as exc:
        print(f"[conformance] run failed: {exc}", flush=True)
        run_failed = True

    mismatches: list[str] = []
    if args.expected:
        expected = json.loads(Path(args.expected).read_text())
        mismatches = compare(rows, expected, ignore=unverifiable)
        if unverifiable:
            print(f"not gated in {args.mode} mode (unobservable): {', '.join(sorted(unverifiable))}")

    if screenshot_bytes:
        (args.out / "screenshot.png").write_bytes(screenshot_bytes)

    (args.out / "results.json").write_text(
        json.dumps(
            {
                "app_name": args.app_name,
                "rows": [row.model_dump() for row in rows],
                "counts": counts,
                "mismatches": mismatches,
                "not_gated": sorted(unverifiable),
            },
            indent=2,
        )
    )
    print(f"artifacts written to {args.out}/")

    if not rows:
        print("the run recorded no results", file=sys.stderr)
        return 1
    print(f"counts: {json.dumps(counts)}")
    if mismatches:
        print("baseline mismatches:", file=sys.stderr)
        for mismatch in mismatches:
            print(f"  - {mismatch}", file=sys.stderr)
        return 1
    if run_failed:
        return 1
    print("all results match the expected baseline" if args.expected else "run complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
