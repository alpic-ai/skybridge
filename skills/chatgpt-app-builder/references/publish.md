# Publish to Directories

## 1. Audit Annotations

**Common cause of rejection.** Ensure all tools and widgets have correct annotations. See [fetch-and-render-data.md](fetch-and-render-data.md).

## 2. Audit CSP

Ensure all external domains are declared in widgets `_meta.ui.csp`. See [csp.md](csp.md).

## 3. Submit

### ChatGPT
Guide user to submit the app at [platform.openai.com](https://platform.openai.com) → Apps.

OpenAI verifies app ownership via `/.well-known/openai-apps-challenge`. Guide user to Alpic **Distribution** tab → **OpenAI Apps Verification Token** → paste the token from OpenAI.

### Claude
Guide user to submit the app on the [Anthropic Connectors Directory FAQ](https://support.claude.com/en/articles/11596036-anthropic-connectors-directory-faq).
