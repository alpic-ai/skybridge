"""ChatGPT (Apps SDK) host adapter: how to send the prompt, tidy the chrome,
verify the follow-up message, and accept the native open-link dialog."""

import json
import time

from playwright.sync_api import Page

from utils import (
    FOLLOW_UP_MARKER,
    PAGE_LOAD_TIMEOUT_MS,
    HostConfig,
    click_top_page_button,
)


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
    for the conversation content instead. Plain Playwright can await the
    promise directly inside evaluate().

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
    backdrop.
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
