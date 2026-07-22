"""Shared building blocks for the conformance driver: result models, the
HostConfig shape, and the host-agnostic widget/overlay helpers that both host
adapters and the runner use.

Imported by chatgpt.py, claude.py, and conformance.py. Third-party deps
(playwright, pydantic) are declared in conformance.py's inline script metadata,
which is the entry point uv resolves; this module just imports them.
"""

import json
import time
from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel
from playwright.sync_api import Page


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

# A host-owned modal overlay, across both hosts: ChatGPT's dialog, and
# Claude's base-ui / cds portal backdrops (which carry no role="dialog" but
# blur the page and intercept every pointer event until dismissed).
HOST_MODAL_SELECTOR = (
    '[role="dialog"], [aria-modal="true"], '
    "[data-cds-portal] [data-state=\"open\"], "
    "[data-base-ui-portal] [data-open]"
)


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


# ── Host dialogs and overlays ────────────────────────────────────────


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
