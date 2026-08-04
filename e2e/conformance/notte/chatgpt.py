"""ChatGPT (Apps SDK) host adapter: how to send the prompt, tidy the chrome,
verify the follow-up message, and accept the native open-link dialog."""

import json
import time

from playwright.sync_api import Page

from utils import (
    CLICK_TIMEOUT_MS,
    FOLLOW_UP_MARKER,
    PAGE_LOAD_TIMEOUT_MS,
    HostConfig,
    click_top_page_button,
)


def send_prompt_chatgpt(page: Page, app_name: str) -> None:
    """Send the single "run @{app_name}" prompt.

    Typing @name pops ChatGPT's app-mention picker; the first Enter selects
    the app from the picker, the second sends the message.

    Dismiss first: the account chooser leaves the composer fillable and the
    message sendable, so a prompt sent under it fails much later and looks like
    a broken widget rather than a blocked login.
    """
    dismiss_modal_chatgpt(page)
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
    """Clear whatever ChatGPT put in front of the composer.

    Two things land here and they want opposite treatment:

    - The "Welcome back / Choose an account to continue" chooser. The session is
      still valid (/api/auth/session reports the account) but the page renders
      the anonymous shell until an account is picked, and an anonymous ChatGPT
      has no connectors: the prompt sends into a logged-out chat, the app is
      never invoked, and every attempt dies on "widget iframe did not appear".
      So pick the account -- closing this one looks like success and silently
      costs the whole run. The row is not a <button> (only Close, Remove
      account, Log in to another account and Create account are), so match on
      role, keyed to the email it carries rather than ChatGPT's own wording.
    - Ordinary interstitials (the rate-limit dialog), which just want "Got it".
    """
    account = page.locator('[role="dialog"] [role="button"]').filter(has_text="@")
    try:
        if account.count():
            account.first.click(timeout=CLICK_TIMEOUT_MS)
            time.sleep(3)  # the shell rehydrates as the logged-in app
            return
    except Exception as exc:
        print(f"[conformance] account chooser: {str(exc).splitlines()[0]}", flush=True)
    page.evaluate(
        """() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Got it');
            if (btn) btn.click();
        }"""
    )
    time.sleep(1)


def check_follow_up_chatgpt(page: Page, timeout_seconds: int = 120, poll_interval: int = 8) -> bool:
    """Detect the follow-up by finding the model's reply in the conversation.

    The conversation DOM is not a reliable witness: the widget stays
    fullscreen after the displayMode test (ChatGPT ignores widget-initiated
    restore), hiding the transcript. Query ChatGPT's same-origin backend API
    for the conversation content instead. Plain Playwright can await the
    promise directly inside evaluate().

    Only the reply is observable: ChatGPT sends the follow-up prompt as a
    hidden tool-authored message that the conversation snapshot excludes, so
    the marker is a token the prompt asks the model to echo back.

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
