# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "playwright>=1.48",
#     "pydantic>=2",
#     "notte-sdk",
# ]
# ///
"""
Drive the Skybridge hooks conformance app end-to-end on a real host with plain
Playwright (sync API).

Sends a single "run @{app_name}" (ChatGPT) / "run {app_name}" (Claude)
prompt, then drives the in-widget stepper like a real tester would: clicks
Run on each action test, verifies the side effects it can observe from
outside the widget (modal, new tab, follow-up message) to answer the app's
Yes/No confirmations honestly, skips the ones it cannot observe, extracts the
results table, and presses Close last.

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
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterator

from pydantic import BaseModel
from playwright.sync_api import BrowserContext, Page, sync_playwright


class ResultRow(BaseModel):
    hook: str
    result: str
    detail: str


class StepperState(BaseModel):
    run_complete: bool
    current_hook: str | None
    action_button: str | None
    confirm_question: str | None
    modal_open: bool
    rows: list[ResultRow]


class StallError(Exception):
    """A test stopped advancing (e.g. ChatGPT remounts the iframe on fullscreen,
    dropping the displayMode test's armed state), so the run can't make progress
    and should be retried in a fresh conversation."""


# Verdicts that mean a row hasn't resolved yet.
_PENDING = ("", "testing", "testing…")


def rows_complete(rows: list[ResultRow]) -> bool:
    """Every test broadcast a real verdict (nothing left pending)."""
    return bool(rows) and all(r.result.strip() not in _PENDING for r in rows)


# Timeout (ms) for the first action after navigation (SPA hydration).
PAGE_LOAD_TIMEOUT_MS = 30_000

# Stepper safety rails: the app has 15 tests, and useRegisterViewTool waits a
# full 60s for the host to invoke the view tool (it never does, so it times out
# to unsupported), which alone is ~15 idle turns; a stuck widget still must not
# spin forever.
MAX_LOOP_TURNS = 60
STEPPER_DEADLINE_S = 10 * 60

FOLLOW_UP_MARKER = "Skybridge conformance test"


# ── Host adapters ────────────────────────────────────────────────────


@dataclass
class HostConfig:
    name: str
    url: str
    widget_iframe_selector: str
    send_prompt: Callable[[Page, str], None]
    hide_sidebar: Callable[[Page], None]
    dismiss_modal: Callable[[Page], None]
    check_follow_up: Callable[[Page], bool]
    # Some hosts gate a hook's effect behind a native permission dialog that
    # must be accepted for the effect to happen (Claude prompts "Open link"
    # for openExternal and "Download" for download). Called right after Run
    # with the current hook; returns True/False when it owns the verification
    # (accepted/failed), or None to let the generic side-effect checks run.
    accept_native_dialog: Callable[[Page, str], bool | None] | None = None


def send_prompt_chatgpt(page: Page, app_name: str) -> None:
    """Send the single "run @{app_name}" prompt.

    Typing @name pops ChatGPT's app-mention picker; the first Enter selects
    the app from the picker, the second sends the message.
    """
    page.fill("#prompt-textarea", f"run @{app_name}", timeout=PAGE_LOAD_TIMEOUT_MS)
    time.sleep(3)  # mention picker
    page.keyboard.press("Enter")
    time.sleep(1)
    page.keyboard.press("Enter")


def hide_sidebar_chatgpt(page: Page) -> None:
    """Collapse the ChatGPT left sidebar so the widget fills more of the screenshot."""
    page.evaluate(
        """() => {
            const btn = document.querySelector('button.cursor-w-resize');
            if (btn) btn.click();
        }"""
    )
    time.sleep(1)


def dismiss_modal_chatgpt(page: Page) -> None:
    """Dismiss any blocking ChatGPT modal (e.g. rate-limit dialog)."""
    page.evaluate(
        """() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Got it');
            if (btn) btn.click();
        }"""
    )
    time.sleep(1)


def check_follow_up_chatgpt(page: Page, timeout_seconds: int = 120, poll_interval: int = 8) -> bool:
    """Detect the follow-up message in the conversation itself.

    The conversation DOM is not a reliable witness: the widget stays
    fullscreen after the displayMode test (ChatGPT ignores widget-initiated
    restore), hiding the transcript. Query ChatGPT's same-origin backend API
    for the conversation content instead. Unlike the Notte version of this
    driver (which could only read a markdown-string return value and had to
    kick the fetch off and poll a window variable), plain Playwright can just
    await the promise directly inside evaluate().

    The polling window is long on purpose: the snapshot endpoint only
    reflects a turn once it completes, which was observed to lag the
    dispatch by 45s+ (network logs of run 3e389d74 show the follow-up POST at
    t+0 and the conversation record still unchanged at t+38s).
    """
    js = f"""
    async () => {{
        const convId = (location.pathname.match(/\\/c\\/([a-z0-9-]+)/i) || [])[1];
        if (!convId) return 'no-conversation-id';
        const sessResp = await fetch('/api/auth/session');
        const token = (await sessResp.json()).accessToken;
        const accountId = (document.cookie.match(/_account=([^;]+)/) || [])[1] || '';
        const resp = await fetch('/backend-api/conversation/' + convId, {{
            headers: {{
                'Authorization': 'Bearer ' + token,
                'ChatGPT-Account-ID': accountId,
            }},
        }});
        if (!resp.ok) return 'http-' + resp.status;
        const text = JSON.stringify(await resp.json());
        return text.includes({json.dumps(FOLLOW_UP_MARKER)}) ? 'found' : 'not-found';
    }}
    """
    elapsed = 0
    while elapsed < timeout_seconds:
        try:
            status = page.evaluate(js)
        except Exception as exc:
            status = f"error: {exc}"
        print(f"[conformance] follow-up check: {status}", flush=True)
        if status == "found":
            return True
        time.sleep(poll_interval)
        elapsed += poll_interval
    return False


def accept_native_dialog_chatgpt(page: Page, hook: str) -> bool | None:
    """Accept ChatGPT's native permission dialog so the effect happens.

    openExternal pops an "External site" dialog (Copy link / Open link);
    clicking "Open link" confirms the host handled the hook and dismisses the
    backdrop. (click_top_page_button is defined below; resolved at call time.)
    """
    if "openexternal" in hook.lower():
        return click_top_page_button(page, "Open link")
    return None


CHATGPT = HostConfig(
    name="chatgpt",
    url="https://chatgpt.com/",
    widget_iframe_selector='iframe[src*="oaiusercontent"]',
    send_prompt=send_prompt_chatgpt,
    hide_sidebar=hide_sidebar_chatgpt,
    dismiss_modal=dismiss_modal_chatgpt,
    check_follow_up=check_follow_up_chatgpt,
    accept_native_dialog=accept_native_dialog_chatgpt,
)


def send_prompt_claude(page: Page, app_name: str) -> None:
    """Send the single "run {app_name}" prompt (verified live).

    Claude's composer is a ProseMirror `contenteditable` div, not an
    `<input>`/`<textarea>`. No mention picker: a single Enter sends, and
    Claude resolves the app by name from the connected MCP servers. Both the
    typing and the Enter get silently swallowed sometimes (cookie banner /
    onboarding popovers stealing focus), so verify each and retry.
    """
    dismiss_modal_claude(page)  # the cookie banner overlay steals the first click
    prompt = f"run {app_name}"
    composer = page.locator('div[contenteditable="true"]').first
    composer.click(timeout=PAGE_LOAD_TIMEOUT_MS)
    for _ in range(3):
        composer.fill(prompt)
        time.sleep(1)
        if prompt in (composer.inner_text() or ""):
            break
    for _ in range(5):
        page.keyboard.press("Enter")
        time.sleep(3)
        # a sent message navigates to /chat/<id> and empties the composer
        if "/chat/" in page.url:
            return
        try:
            if prompt not in (composer.inner_text() or ""):
                return
        except Exception:
            return  # composer re-rendered away: the message left
    raise TimeoutError("the claude composer never sent the prompt")


def hide_sidebar_claude(page: Page) -> None:
    """No-op: Claude's sidebar doesn't overlap the widget, nothing to collapse."""
    return


def dismiss_modal_claude(page: Page) -> None:
    """Accept the cookie banner: its overlay swallows clicks near the composer."""
    page.evaluate(
        """() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Accept All Cookies');
            if (btn) btn.click();
        }"""
    )
    time.sleep(1)


def click_top_page_button(page: Page, label: str, timeout_seconds: int = 20) -> bool:
    """Click a control by exact text in a top-page host dialog (not the widget).

    Hosts render native permission dialogs (Open link / Download) as top-page
    portals that appear a beat after the triggering hook runs and block all
    other clicks until answered; poll for the control, then click it with the
    same CDP-aware timeout as real_click (a 2s click times out over Notte's
    remote browser, which silently left the download unaccepted).

    The control's role varies by host: Claude's "Open link" is a <button>, but
    ChatGPT's "External site" dialog renders "Open link" as an <a> — so match
    button, link, or bare text rather than assuming a role.
    """
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        for locator in (
            page.get_by_role("button", name=label, exact=True),
            page.get_by_role("link", name=label, exact=True),
            page.get_by_text(label, exact=True),
        ):
            try:
                if locator.count():
                    locator.first.click(timeout=CLICK_TIMEOUT_MS)
                    return True
            except Exception:
                continue
        time.sleep(1)
    return False


def accept_native_dialog_claude(page: Page, hook: str) -> bool | None:
    """Accept Claude's native permission dialogs so the effect actually happens.

    openExternal and download are gated behind a host dialog ("Open link" /
    "Download"); without a click the tab never opens and download() times out,
    and the dialog's backdrop blocks every later click. requestModal renders
    the view in modal mode inside the widget (no host dialog) and the app's
    own display-store check reports it, matching the manual baseline.
    """
    hook_lc = hook.lower()
    if "openexternal" in hook_lc:
        return click_top_page_button(page, "Open link")
    if "download" in hook_lc:
        return click_top_page_button(page, "Download")
    if "requestmodal" in hook_lc:
        return True
    return None


def check_follow_up_claude(page: Page, timeout_seconds: int = 120, poll_interval: int = 8) -> bool:
    """TODO(claude): verify live.

    There's no known same-origin backend API to query on claude.ai (unlike
    ChatGPT's /backend-api/conversation/<id>), so this falls back to scraping
    the visible conversation transcript for the marker text. That's weaker
    (the widget may cover the transcript, same as on ChatGPT) — swap this out
    for a real API check if/when one is found.
    """
    elapsed = 0
    while elapsed < timeout_seconds:
        found = page.evaluate(
            "(marker) => document.body.innerText.includes(marker)",
            FOLLOW_UP_MARKER,
        )
        if found:
            return True
        time.sleep(poll_interval)
        elapsed += poll_interval
    return False


CLAUDE = HostConfig(
    name="claude",
    url="https://claude.ai/new",
    # Verified live: Claude renders MCP Apps views in a sandboxed iframe on
    # <hash>.claudemcpcontent.com/mcp_apps.
    widget_iframe_selector='iframe[src*="claudemcpcontent"]',
    send_prompt=send_prompt_claude,
    hide_sidebar=hide_sidebar_claude,
    dismiss_modal=dismiss_modal_claude,
    check_follow_up=check_follow_up_claude,
    accept_native_dialog=accept_native_dialog_claude,
)

HOSTS: dict[str, HostConfig] = {CHATGPT.name: CHATGPT, CLAUDE.name: CLAUDE}


# ── Widget interaction (host-agnostic) ───────────────────────────────


def wait_for_widget(page: Page, selector: str, timeout_seconds: int = 90, poll_interval: int = 3) -> None:
    """Poll until the widget iframe is in the conversation."""
    elapsed = 0
    while elapsed < timeout_seconds:
        has_widget = page.evaluate("(sel) => Boolean(document.querySelector(sel))", selector)
        if has_widget:
            return
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise TimeoutError(f"widget iframe did not appear within {timeout_seconds}s")


def center_widget(page: Page, selector: str) -> None:
    """Scroll the top of the widget iframe into view.

    The stepper card sits at the top of the app (results table below); with a
    widget taller than the viewport, centering the iframe pushes the stepper
    above the fold and the driver can no longer see the buttons.
    """
    page.evaluate(
        """(sel) => {
            const iframe = document.querySelector(sel);
            if (iframe) iframe.scrollIntoView({ block: 'start', behavior: 'instant' });
        }""",
        selector,
    )
    time.sleep(1)


def take_screenshot(page: Page, selector: str) -> bytes | None:
    center_widget(page, selector)
    # animations="disabled" finishes/cancels CSS animations first: Claude runs
    # a perpetual one that otherwise hangs the default screenshot forever.
    try:
        return page.screenshot(animations="disabled", timeout=15_000)
    except Exception as exc:
        print(f"[conformance] screenshot failed: {exc}", flush=True)
        return None


# Button labels in the widget, per drive action (src/views/conformance.tsx).
# The "run" action's label varies per test (Run/Close), so callers pass it.
ACTION_LABELS = {
    "yes": "Yes, it worked",
    "no": "No effect",
    "skip": "Skip",
}


# A real click's actionability checks (visible/stable/scroll) run over the wire,
# so the timeout must cover round-trip latency: near-instant locally, but seconds
# against a remote Notte cloud browser over CDP.
CLICK_TIMEOUT_MS = 12_000


def real_click(page: Page, label: str) -> bool:
    """Click a widget button with a REAL, trusted mouse event.

    The postMessage drive protocol carries no user activation, and ChatGPT
    gates user-facing effects on a genuine gesture: a follow-up sent (or a
    tab opened) from a synthetic click is silently dropped. Playwright can
    click across the host's cross-origin iframes (something the Notte action
    API could not), so prefer that and fall back to postMessage when the
    button isn't reachable.

    The widget's cross-origin frames churn while the host (re)mounts them,
    especially over remote CDP, so a "Frame was detached" mid-scan is expected;
    tolerate it and rescan a couple of times before giving up.
    """
    for attempt in range(3):
        for frame in list(page.frames):
            if frame is page.main_frame:
                continue
            try:
                button = frame.get_by_role("button", name=label, exact=True)
                if button.count():
                    button.first.click(timeout=CLICK_TIMEOUT_MS)
                    return True
            except Exception as exc:
                # First line only: Playwright's full click call-log is huge.
                print(f"[conformance] real_click '{label}': {str(exc).splitlines()[0]}", flush=True)
                continue
        time.sleep(1)  # let a detached/remounting frame settle, then rescan
    return False


def drive_widget(page: Page, selector: str, action: str, label: str | None = None) -> None:
    """Press a widget button: real click first, postMessage drive as fallback.

    The widget lives behind cross-origin iframes (the host's sandboxed
    origin, with a nested #root frame on some hosts); the app also listens
    for {type: "conformance:drive", action} messages (actions: run, skip,
    yes, no, close-modal, restore-inline). postMessage crosses origins, and
    posting to the iframe window plus each of its child frames covers both
    nesting layouts.
    """
    label = label or ACTION_LABELS.get(action)
    if label and real_click(page, label):
        print(f"[conformance] drive '{action}': clicked '{label}'", flush=True)
        time.sleep(2)
        return
    result = page.evaluate(
        """([sel, act]) => {
            const iframe = document.querySelector(sel);
            if (!iframe) return 'no-iframe';
            const message = { type: 'conformance:drive', action: act };
            const outer = iframe.contentWindow;
            outer.postMessage(message, '*');
            for (let i = 0; i < outer.frames.length; i++) {
                outer.frames[i].postMessage(message, '*');
            }
            return 'sent';
        }""",
        [selector, action],
    )
    print(f"[conformance] drive '{action}': {result}", flush=True)
    time.sleep(2)


def install_state_listener(page: Page) -> None:
    """Capture the app's state broadcasts on the host page.

    The widget posts {type: "conformance:state", state} to window.top on
    every change plus a 1.5s heartbeat; stash the latest payload (a real
    object now, no JSON-string round trip needed) in a window variable that
    read_state polls. Zero LLM involved.
    """
    page.evaluate(
        """() => {
            if (window.__confListenerInstalled) return 'already';
            window.__confListenerInstalled = true;
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'conformance:state') {
                    window.__confState = event.data.state;
                }
            });
            return 'installed';
        }"""
    )


def read_state(page: Page, timeout_seconds: int = 20, poll_interval: int = 2) -> StepperState:
    """Read the latest state broadcast (deterministic replacement for scraping)."""
    elapsed = 0
    while elapsed < timeout_seconds:
        data = page.evaluate("() => window.__confState || null")
        if data:
            return StepperState(**data)
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise TimeoutError(f"the widget broadcast no state within {timeout_seconds}s")


def widget_present(page: Page, selector: str) -> bool:
    return page.evaluate("(sel) => Boolean(document.querySelector(sel))", selector)


# ── Outside verification of side effects ─────────────────────────────


# A host-owned modal overlay, across both hosts: ChatGPT's dialog, and
# Claude's base-ui / cds portal backdrops (which carry no role="dialog" but
# blur the page and intercept every pointer event until dismissed).
HOST_MODAL_SELECTOR = (
    '[role="dialog"], [aria-modal="true"], '
    "[data-cds-portal] [data-state=\"open\"], "
    "[data-base-ui-portal] [data-open]"
)


def host_modal_present(page: Page) -> bool:
    return page.evaluate("(sel) => Boolean(document.querySelector(sel))", HOST_MODAL_SELECTOR)


def dismiss_host_overlay(page: Page, timeout_seconds: int = 12) -> None:
    """Clear a host-owned modal/overlay and WAIT until it's actually gone.

    The modal is host-owned on both hosts and the app's closeModal is a no-op
    there. Its backdrop intercepts every pointer event, so if we don't wait
    for it to clear the next test (useOpenExternal) fires into a live backdrop
    that swallows its clicks and its new tab — on Claude this poisoned the
    whole rest of the run. Escape is the host's own dismiss path, but the
    close is async, so Escape then poll the top-page DOM, re-pressing until
    the overlay is gone.
    """
    elapsed = 0
    while elapsed < timeout_seconds:
        try:
            page.keyboard.press("Escape")
        except Exception as exc:
            print(f"[conformance] escape failed: {exc}", flush=True)
            return
        time.sleep(2)
        elapsed += 2
        if not host_modal_present(page):
            return
    print("[conformance] overlay still present after dismiss attempts", flush=True)


def close_host_modal(page: Page, selector: str) -> None:
    """Close whatever modal the requestModal test opened.

    Escape covers host-chromed modals (ChatGPT), the drive command covers the
    in-view polyfill Close on other hosts. Both are no-ops when nothing is
    open.
    """
    try:
        page.keyboard.press("Escape")
        time.sleep(1)
    except Exception:
        pass
    drive_widget(page, selector, "close-modal")


def check_new_tab(context: BrowserContext, main_page: Page) -> bool:
    """Detect whether openExternal opened the target in a new tab.

    visibilityState is useless here (the automated tab stays "visible" no
    matter what), so probe for a second page directly: a new tab shows up as
    an extra entry in context.pages. Read its hostname, close it, and refocus
    the main page. No second tab -> not verified.
    """
    time.sleep(3)  # give the new tab a beat to open
    if len(context.pages) < 2:
        return False
    new_page = context.pages[-1]
    host = ""
    try:
        host = new_page.evaluate("() => location.hostname")
    except Exception as exc:
        print(f"[conformance] failed reading new tab host: {exc}", flush=True)
    print(f"[conformance] second tab host: {host}", flush=True)
    try:
        new_page.close()
    except Exception as exc:
        print(f"[conformance] closing new tab failed: {exc}", flush=True)
    main_page.bring_to_front()
    return "skybridge" in host


def answer_confirm(
    page: Page,
    context: BrowserContext,
    selector: str,
    host: HostConfig,
    hook: str,
    verified_effects: dict[str, bool],
    unverifiable: frozenset[str],
) -> None:
    """Answer the app's Yes/No confirmation by verifying the effect from outside.

    Effects the browser cannot observe (e.g. a file landing on disk, or an
    external tab that a cloud browser never surfaces) are skipped rather than
    guessed, so the report stays honest.
    """
    if hook in unverifiable:
        print(f"[conformance] '{hook}' is not observable in this mode, skipping", flush=True)
        drive_widget(page, selector, "skip")
        return
    hook_lc = hook.lower()
    if hook in verified_effects:
        # A host-native permission dialog already settled this (Claude's
        # Open link / Download / in-widget modal), recorded right after Run.
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
    elif "openexternal" in hook_lc:
        verified = check_new_tab(context, page)
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
    page: Page, context: BrowserContext, host: HostConfig, unverifiable: frozenset[str]
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
                page, context, selector, host, state.current_hook or "", verified_effects, unverifiable
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
                # (Claude: Open link / Download) that appears right after Run
                # and blocks every later click until answered.
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
    context: BrowserContext,
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
                rows, final_screenshot = drive_stepper(page, context, host, unverifiable)
                screenshot_bytes = final_screenshot or screenshot_bytes
            except (TimeoutError, StallError) as exc:
                print(f"[conformance] attempt {attempt + 1} aborted: {exc}", flush=True)
                continue
            if rows_complete(rows):
                break
            print(
                f"[conformance] attempt {attempt + 1} incomplete "
                f"({sum(1 for r in rows if r.result.strip() in _PENDING)} rows unresolved)",
                flush=True,
            )
    except Exception as exc:
        # Swallow rather than propagate, same as the Notte version: a partial
        # run (whatever rows got broadcast before things went wrong) is more
        # useful than nothing, and the caller still gets a real result to
        # write out and compare against the baseline.
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
            # Popup blocking must be off: the openExternal test's new tab is
            # opened without a user gesture (the click is driven via
            # postMessage), which the blocker would silently eat.
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


def load_dotenv(path: Path) -> None:
    """Populate os.environ from a .env file (KEY=VALUE lines) without clobbering
    existing vars. Enough for the notte:* vars; CI passes real env vars instead."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


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
    # parsed, so the --profile-id default and NotteClient both see it. CI sets
    # these as real env vars, so setdefault leaves them untouched there.
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
            result = run_conformance(host, page, context, args.app_name, unverifiable)
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
