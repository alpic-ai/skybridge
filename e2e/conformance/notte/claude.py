"""Claude (MCP Apps) host adapter: how to send the prompt, clear the overlays in
front of the composer, verify the follow-up message, and accept the native
permission dialogs."""

import time

from playwright.sync_api import Page

from utils import (
    FOLLOW_UP_MARKER,
    PAGE_LOAD_TIMEOUT_MS,
    HostConfig,
    click_top_page_button,
    dismiss_host_overlay,
    host_modal_present,
)


def hide_sidebar_claude(page: Page) -> None:
    """No-op: Claude's sidebar doesn't overlap the widget, nothing to collapse."""
    return


def dismiss_modal_claude(page: Page) -> None:
    """Clear whatever Claude put in front of the composer.

    Two kinds land here: the cookie banner (no dialog role, Escape does
    nothing, wants its Accept button) and the announcement dialogs Claude
    greets a fresh session with (the plan upsell), which blur the page and
    intercept every click until Escape closes them. Either one left standing
    swallows the click aimed at the composer and costs the whole attempt.
    """
    page.evaluate(
        """() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Accept All Cookies');
            if (btn) btn.click();
        }"""
    )
    time.sleep(1)
    if host_modal_present(page):
        dismiss_host_overlay(page)


def send_prompt_claude(page: Page, app_name: str) -> None:
    """Send the single "run {app_name}" prompt.

    Claude's composer is a ProseMirror `contenteditable` div, not an
    `<input>`/`<textarea>`. No mention picker: a single Enter sends, and
    Claude resolves the app by name from the connected MCP servers. Both the
    typing and the Enter get silently swallowed sometimes (cookie banner /
    onboarding popovers stealing focus), so verify each and retry.
    """
    dismiss_modal_claude(page)  # an overlay would swallow the click aimed at the composer
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


def check_follow_up_claude(page: Page, timeout_seconds: int = 120, poll_interval: int = 8) -> bool:
    """Detect the follow-up message by scraping the visible transcript.

    There's no known same-origin backend API to query on claude.ai (unlike
    ChatGPT's /backend-api/conversation/<id>), so this scrapes the conversation
    for the marker text. Verified live: the transcript stays visible on Claude,
    so the scrape is reliable here even though it would be flaky on ChatGPT.
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
