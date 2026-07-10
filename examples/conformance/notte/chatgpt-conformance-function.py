"""
Notte function: run the Skybridge hooks conformance app end-to-end on ChatGPT.

Expects the conformance app to be ALREADY CONNECTED in the ChatGPT
account/workspace the profile is logged into (see the app README's E2E section). Sends a
single "run @Conformance" prompt, then drives the in-widget stepper like a
real tester would: clicks Run on each action test, verifies the side effects
it can observe from outside the widget (modal, new tab, follow-up message) to
answer the app's Yes/No confirmations honestly, skips the ones it cannot
observe, extracts the results table, and presses Close last.

Usage (SDK):
    client = NotteClient()
    fn = client.Function("<id>")
    result = fn.run(profile_id="notte-profile-...", app_name="Conformance")

Usage (HTTP):
    POST /functions/<id>/runs/start
    {"variables": {"profile_id": "notte-profile-...", "app_name": "Conformance"}}
"""

import json
import time
from base64 import b64encode
from typing import Any

from pydantic import BaseModel

from notte_sdk import NotteClient


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


client = NotteClient()

# Timeout for first action after navigation (SPA hydration)
PAGE_LOAD_TIMEOUT = 30000

# Stepper safety rails: the app has 15 tests but confirms/modal handling and
# the useToolInfo delivery wait (up to 30s of "testing" turns) add extra loop
# turns, and a stuck widget must not spin forever.
MAX_LOOP_TURNS = 45
STEPPER_DEADLINE_S = 10 * 60

FOLLOW_UP_MARKER = "Skybridge conformance test"


def run(profile_id: str, app_name: str = "Conformance") -> dict[str, Any]:
    rows: list[ResultRow] = []
    screenshot_b64 = None

    with client.Session(
        profile={"id": profile_id, "persist": True},
        headless=False,  # headless Chromium drops cross-origin MessagePort transfers, breaking the widget init handshake
        # Tall viewport so the stepper card AND the results table fit on screen;
        # the agent can only click what is visible.
        viewport_width=1440,
        viewport_height=1400,
    ) as session:

        session.execute(type="goto", url="https://chatgpt.com/")
        time.sleep(5)  # SPA hydration

        try:
            send_conformance_prompt(session, app_name)
            # Early capture, replaced by the pre-close one when the run gets there.
            screenshot_b64 = take_screenshot(session)
            rows, final_screenshot = drive_stepper(session)
            screenshot_b64 = final_screenshot or screenshot_b64
        except Exception as exc:
            print(f"[chatgpt-conformance] stepper run failed: {exc}", flush=True)

    counts: dict[str, int] = {}
    for row in rows:
        verdict = row.result.strip().lower() or "untested"
        counts[verdict] = counts.get(verdict, 0) + 1

    # Returned as a JSON STRING on purpose: Notte persists non-str results on
    # the run record via str(), i.e. Python repr with single quotes, which
    # consumers cannot parse. A JSON string round-trips intact.
    return json.dumps({
        "app_name": app_name,
        "rows": [row.model_dump() for row in rows],
        "counts": counts,
        "screenshot_b64": screenshot_b64,
    })


# ── XHR helpers (same as chatgpt-rendering-function) ─────────────────


# ── Conversation setup ───────────────────────────────────────────────


def send_conformance_prompt(session, app_name: str):
    """Send the single "run @Conformance" prompt and wait for the widget.

    Typing @name pops ChatGPT's app-mention picker; the first Enter selects
    the app from the picker, the second sends the message.
    """
    session.execute(
        type="fill",
        selector="#prompt-textarea",
        value=f"run @{app_name}",
        timeout=PAGE_LOAD_TIMEOUT,
    )
    time.sleep(3)  # mention picker
    session.execute(type="press_key", key="Enter")
    time.sleep(1)
    session.execute(type="press_key", key="Enter")

    wait_for_widget(session)
    time.sleep(12)  # let the app's automatic tests record


def wait_for_widget(session, timeout_seconds: int = 90, poll_interval: int = 3):
    """Poll until the widget iframe is in the conversation."""
    js_poll = """
    (() => {
        return JSON.stringify({
            hasWidget: Boolean(document.querySelector('iframe[src*="oaiusercontent"]')),
        });
    })()
    """
    elapsed = 0
    while elapsed < timeout_seconds:
        raw = session.execute(type="evaluate_js", code=js_poll)
        if json.loads(raw.data.markdown)["hasWidget"]:
            return
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise TimeoutError(f"widget iframe did not appear within {timeout_seconds}s")


# ── Widget interaction ───────────────────────────────────────────────


def hide_sidebar(session):
    """Collapse the ChatGPT left sidebar so the widget fills more of the screenshot."""
    session.execute(
        type="evaluate_js",
        code="""
        (() => {
            const btn = document.querySelector('button.cursor-w-resize');
            if (btn) btn.click();
        })()
        """,
    )
    time.sleep(1)


def dismiss_modal(session):
    """Dismiss any blocking ChatGPT modal (e.g. rate-limit dialog)."""
    session.execute(
        type="evaluate_js",
        code="""
        (() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Got it');
            if (btn) btn.click();
        })()
        """,
    )
    time.sleep(1)


def center_widget(session):
    """Scroll the top of the widget iframe into view.

    The stepper card sits at the top of the app (results table below); with a
    widget taller than the viewport, centering the iframe pushes the stepper
    above the fold and the agent can no longer see the buttons.
    """
    session.execute(
        type="evaluate_js",
        code="""
        (() => {
            const iframe = document.querySelector('iframe[src*="oaiusercontent"]');
            if (iframe) iframe.scrollIntoView({ block: 'start', behavior: 'instant' });
        })()
        """,
    )
    time.sleep(1)


def take_screenshot(session) -> str:
    center_widget(session)
    obs = session.observe()
    return b64encode(obs.screenshot.raw).decode()


def drive_widget(session, action: str):
    """Send a drive command to the app's automation hook.

    The widget lives behind cross-origin iframes (oaiusercontent sandbox with
    a nested #root frame) that selector clicks cannot reliably pierce, so the
    app listens for {type: "conformance:drive", action} messages instead
    (actions: run, skip, yes, no, close-modal). postMessage crosses origins,
    and posting to the sandbox window plus each of its child frames covers
    both nesting layouts.
    """
    js_code = f"""
    (() => {{
        const iframe = document.querySelector('iframe[src*="oaiusercontent"]');
        if (!iframe) return 'no-iframe';
        const message = {{ type: 'conformance:drive', action: {json.dumps(action)} }};
        const outer = iframe.contentWindow;
        outer.postMessage(message, '*');
        for (let i = 0; i < outer.frames.length; i++) {{
            outer.frames[i].postMessage(message, '*');
        }}
        return 'sent';
    }})()
    """
    raw = session.execute(type="evaluate_js", code=js_code)
    print(f"[chatgpt-conformance] drive '{action}': {raw.data.markdown}", flush=True)
    time.sleep(2)


def install_state_listener(session):
    """Capture the app's state broadcasts on the ChatGPT page.

    The widget posts {type: "conformance:state", state} to window.top on every
    change plus a 1.5s heartbeat; stash the latest payload in a window variable
    that read_state polls. Zero LLM involved.
    """
    session.execute(
        type="evaluate_js",
        code="""
        (() => {
            if (window.__confListenerInstalled) return 'already';
            window.__confListenerInstalled = true;
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'conformance:state') {
                    window.__confState = JSON.stringify(event.data.state);
                }
            });
            return 'installed';
        })()
        """,
    )


def read_state(session, timeout_seconds: int = 20, poll_interval: int = 2) -> StepperState:
    """Read the latest state broadcast (deterministic replacement for scraping)."""
    elapsed = 0
    while elapsed < timeout_seconds:
        raw = session.execute(type="evaluate_js", code="window.__confState || 'null'")
        text = raw.data.markdown.strip()
        data = json.loads(text)
        if isinstance(data, str):  # defensively handle double-encoded returns
            data = json.loads(data)
        if data:
            return StepperState(**data)
        time.sleep(poll_interval)
        elapsed += poll_interval
    raise TimeoutError(f"the widget broadcast no state within {timeout_seconds}s")


# ── Outside verification of side effects ─────────────────────────────


def close_host_modal(session):
    """Close whatever modal the requestModal test opened.

    Escape covers host-chromed modals (ChatGPT), the drive command covers the
    in-view polyfill Close on other hosts. Both are no-ops when nothing is open.
    """
    try:
        session.execute(type="press_key", key="Escape")
        time.sleep(1)
    except Exception:
        pass
    drive_widget(session, "close-modal")


def check_new_tab(session) -> bool:
    """Detect whether openExternal opened the target in a new tab.

    visibilityState is useless here (CDP keeps the automated tab "visible"),
    so probe for a second tab directly: switch to it, read its hostname,
    switch back. No second tab → switch_tab raises → not verified.
    """
    time.sleep(3)  # give the new tab a beat to open
    try:
        session.execute(type="switch_tab", tab_index=1)
    except Exception:
        return False
    raw = session.execute(type="evaluate_js", code="location.hostname")
    host = raw.data.markdown.strip().strip('"')
    print(f"[chatgpt-conformance] second tab host: {host}", flush=True)
    try:
        session.execute(type="switch_tab", tab_index=0)
        time.sleep(1)
    except Exception as exc:
        print(f"[chatgpt-conformance] switch back failed: {exc}", flush=True)
    return "skybridge" in host


def check_follow_up(session, timeout_seconds: int = 120, poll_interval: int = 8) -> bool:
    """Detect the follow-up message in the conversation itself.

    The conversation DOM is not a reliable witness: the widget stays
    fullscreen after the displayMode test (ChatGPT ignores widget-initiated
    restore), hiding the transcript. Query ChatGPT's same-origin backend API
    for the conversation content instead. The fetch is async, so kick it off
    and poll the result from a window variable rather than relying on
    evaluate_js awaiting promises.

    The window is long on purpose: the snapshot endpoint only reflects a turn
    once it completes, which was observed to lag the dispatch by 45s+ (network
    logs of run 3e389d74 show the follow-up POST at t+0 and the conversation
    record still unchanged at t+38s).
    """
    js_kick = f"""
    (() => {{
        window.__followUpCheck = 'pending';
        (async () => {{
            try {{
                const convId = (location.pathname.match(/\\/c\\/([a-z0-9-]+)/i) || [])[1];
                if (!convId) {{ window.__followUpCheck = 'no-conversation-id'; return; }}
                const sessResp = await fetch('/api/auth/session');
                const token = (await sessResp.json()).accessToken;
                const accountId = (document.cookie.match(/_account=([^;]+)/) || [])[1] || '';
                const resp = await fetch('/backend-api/conversation/' + convId, {{
                    headers: {{
                        'Authorization': 'Bearer ' + token,
                        'ChatGPT-Account-ID': accountId,
                    }},
                }});
                if (!resp.ok) {{ window.__followUpCheck = 'http-' + resp.status; return; }}
                const text = JSON.stringify(await resp.json());
                window.__followUpCheck = text.includes({json.dumps(FOLLOW_UP_MARKER)})
                    ? 'found'
                    : 'not-found';
            }} catch (e) {{
                window.__followUpCheck = 'error: ' + e;
            }}
        }})();
        return 'kicked';
    }})()
    """
    elapsed = 0
    while elapsed < timeout_seconds:
        session.execute(type="evaluate_js", code=js_kick)
        time.sleep(2)
        raw = session.execute(type="evaluate_js", code="window.__followUpCheck || 'missing'")
        status = raw.data.markdown.strip().strip('"')
        print(f"[chatgpt-conformance] follow-up check: {status}", flush=True)
        if status == "found":
            return True
        time.sleep(poll_interval)
        elapsed += poll_interval + 2
    return False


def answer_confirm(session, hook: str, modal_seen: bool):
    """Answer the app's Yes/No confirmation by verifying the effect from outside.

    Effects the browser cannot observe (e.g. a file landing on disk) are
    skipped rather than guessed, so the report stays honest.
    """
    hook_lc = hook.lower()
    if "requestmodal" in hook_lc:
        verified = modal_seen
    elif "openexternal" in hook_lc:
        verified = check_new_tab(session)
    elif "sendfollowupmessage" in hook_lc:
        verified = check_follow_up(session)
    else:
        print(f"[chatgpt-conformance] cannot verify '{hook}' from outside, skipping", flush=True)
        drive_widget(session, "skip")
        return
    drive_widget(session, "yes" if verified else "no")


# ── The stepper loop ─────────────────────────────────────────────────


def widget_present(session) -> bool:
    raw = session.execute(
        type="evaluate_js",
        code="JSON.stringify({ present: Boolean(document.querySelector('iframe[src*=\"oaiusercontent\"]')) })",
    )
    return json.loads(raw.data.markdown)["present"]


def finalize_close(session, rows: list[ResultRow]) -> list[ResultRow]:
    """Resolve the useRequestClose row after driving Close.

    The app records a verdict only when the close FAILS (it waits 2s, then
    broadcasts the row); a granted close dismisses the view before anything
    can be recorded, leaving the last broadcast frozen at "testing". The
    driver is the one who can observe the dismissal, so it fills the verdict
    in on the app's behalf.
    """
    time.sleep(8)  # app-side failure verdict lands ~2s after the request
    try:
        state = read_state(session, timeout_seconds=4, poll_interval=2)
        if state.rows:
            rows = state.rows
    except TimeoutError:
        pass  # no broadcast at all — treat like a dismissed widget below
    dismissed = not widget_present(session)
    for row in rows:
        if row.hook == "useRequestClose" and row.result.strip() in ("", "testing", "testing…"):
            row.result = "supported" if dismissed else "unsupported"
            row.detail = (
                "the host dismissed the view (verified by the driver)"
                if dismissed
                else "the view is still visible after requestClose"
            )
    return rows


def drive_stepper(session) -> tuple[list[ResultRow], str | None]:
    hide_sidebar(session)
    dismiss_modal(session)
    install_state_listener(session)

    rows: list[ResultRow] = []
    modal_seen = False
    deadline = time.time() + STEPPER_DEADLINE_S

    for turn in range(MAX_LOOP_TURNS):
        if time.time() > deadline:
            print("[chatgpt-conformance] stepper deadline reached", flush=True)
            break

        state = read_state(session)
        if state.rows:
            rows = state.rows
        print(
            f"[chatgpt-conformance] turn={turn} hook={state.current_hook} "
            f"button={state.action_button} confirm={bool(state.confirm_question)} "
            f"modal={state.modal_open} complete={state.run_complete}",
            flush=True,
        )

        if state.modal_open:
            # The requestModal test is showing its modal: that IS the effect.
            modal_seen = True
            close_host_modal(session)
            continue

        if state.run_complete:
            break

        if state.confirm_question:
            answer_confirm(session, state.current_hook or "", modal_seen)
            continue

        if state.action_button:
            is_close = state.action_button.strip().lower() == "close"
            if is_close:
                # Capture the fully-filled table BEFORE asking the host to
                # dismiss the view — a granted close leaves nothing to shoot.
                screenshot_b64 = take_screenshot(session)
                drive_widget(session, "run")
                rows = finalize_close(session, rows)
                return rows, screenshot_b64
            drive_widget(session, "run")
            if state.current_hook and "displaymode" in state.current_hook.lower():
                # The fullscreen test no longer restores itself, and a
                # fullscreen widget hides the conversation DOM that later
                # checks rely on; restore through the app's own API.
                time.sleep(4)
                drive_widget(session, "restore-inline")
            time.sleep(6)
            continue

        # Automatic tests still running
        time.sleep(4)

    return rows, take_screenshot(session)
