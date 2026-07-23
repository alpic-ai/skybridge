"""Alpic playground host adapter: the Skybridge "try this server" playground
at <server>/try (https://conformance.skybridge.tech/try), which renders MCP
Apps views inline in a chat.

Thinner than the chat hosts: the playground is already bound to this server's
tools, so there's no app to connect and no account to log into. The prompt is
plain (no @mention, no app-name resolution), and only two effects surface
differently from ChatGPT/Claude:

  - openExternal is forwarded to a top-page window.open (no permission dialog,
    no tab the driver can track), recorded by install_state_listener.
  - requestModal opens the view as a host dialog (role="dialog" with a "Close"
    control) rather than a native OS dialog.
"""

import time

from playwright.sync_api import Page

from utils import (
    PAGE_LOAD_TIMEOUT_MS,
    HostConfig,
    click_top_page_button,
    host_modal_present,
)


def send_prompt_alpic(page: Page, app_name: str) -> None:
    """Type into the playground composer and send.

    The composer is a plain <textarea>; a single Enter sends. No mention
    picker and no app to pick (the playground is already scoped to this
    server), so the model just calls the `conformance` tool and the view
    renders inline.
    """
    composer = page.locator("textarea").first
    composer.click(timeout=PAGE_LOAD_TIMEOUT_MS)
    composer.fill(f"run {app_name}")
    time.sleep(1)
    page.keyboard.press("Enter")


def hide_sidebar_alpic(page: Page) -> None:
    """No-op: the playground's thin icon rail doesn't overlap the widget."""
    return


def dismiss_modal_alpic(page: Page) -> None:
    """No-op: the playground has no cookie/consent banner to clear."""
    return


def check_follow_up_alpic(page: Page, timeout_seconds: int = 120, poll_interval: int = 4) -> bool:
    """Detect the follow-up by the reply it triggers.

    The playground doesn't render the programmatic follow-up as a visible user
    bubble (so there's no marker text to scrape, unlike Claude) — it only shows
    the model's reply. Every run has exactly one assistant turn before this
    test (the response to the "run" prompt), so a second assistant message is
    the follow-up landing. Assistant turns carry data-role="assistant".
    """
    js = '() => document.querySelectorAll(\'[data-role="assistant"]\').length'
    elapsed = 0
    while elapsed < timeout_seconds:
        if page.evaluate(js) >= 2:
            return True
        time.sleep(poll_interval)
        elapsed += poll_interval
    return False


def accept_native_dialog_alpic(page: Page, hook: str) -> bool | None:
    """Verify the effects the playground surfaces in the top page.

    Called right after Run:
      - openExternal: the playground forwards it to window.open (recorded by
        install_state_listener); a docs.skybridge URL among the calls confirms
        the host opened the link. window.open fires synchronously during Run,
        but poll briefly to absorb the drive round-trip.
      - requestModal: the view opens as a host dialog. Count it supported (like
        Claude) and click its Close so the backdrop can't block later tests.
      - download: no host dialog; the app detects the no-op itself (return None
        so the generic path leaves the app's own unsupported verdict).
    """
    hook_lc = hook.lower()
    if "openexternal" in hook_lc:
        for _ in range(6):
            opens = page.evaluate("() => window.__externalOpens || []")
            if any("docs.skybridge" in url for url in opens):
                return True
            time.sleep(1)
        return False
    if "requestmodal" in hook_lc:
        for _ in range(6):
            if host_modal_present(page):
                click_top_page_button(page, "Close")
                return True
            time.sleep(1)
        return False
    return None


ALPIC = HostConfig(
    name="alpic",
    url="https://conformance.skybridge.tech/try",
    # The playground renders MCP Apps views in a sandboxed iframe served at
    # <server>/try/mcp-app-sandbox/index.html.
    widget_iframe_selector='iframe[src*="mcp-app-sandbox"]',
    send_prompt=send_prompt_alpic,
    hide_sidebar=hide_sidebar_alpic,
    dismiss_modal=dismiss_modal_alpic,
    check_follow_up=check_follow_up_alpic,
    accept_native_dialog=accept_native_dialog_alpic,
)
