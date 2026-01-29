# Brainstorming Workflow

Validate whether a ChatGPT app idea is a good fit. Stay high level—focus on the problem, user, and core action. Do not discuss implementation details (tools, APIs, data schemas, field mappings).

If you have enough context to validate, move forward. Don't ask questions you can infer or that only matter during implementation.

## 1. Explore the idea

Understand:
- What problem does this solve?
- Who is the target user?
- What actions/data does it involve?
- What exists today (website, API, product)?

When you have a clear idea of what the app does, move to the next step.

## 2. Validate against UX principles

A ChatGPT app should do something _better_ because it lives in conversation. Good fits: booking ordering, checking status, tracking. Poor fits: reading long content, complex multi-step workflows, ads.

Ask yourself:
- Does natural language beat forms/buttons here? If not, find the part where "just say it" wins.
- Is it a few focused actions, not a full app port? If not, pick 2-3 high-frequency tasks.
- Does it need proprietary data or APIs? If not, what unique capability does the user have?

If issues exist, explain what needs to change. Don't recite criteria—just address the gap. If solid, proceed to wrap up.

## 3. Wrapping up

Create `SPEC.md` immediately:

### Header
---
name: App Name
description: Use the `chatgpt-app-builder` Skill to update this project.
---

### Value Proposition
- What problem it solves and for whom

### Product Context
- Existing products
- Data sources, APIs, and services the app connects to
- Any constraints or dependencies

Example SPEC.md:
```markdown
---
name: pizza-ordering
description: Use the `chatgpt-app-builder` Skill to update this project.
---

# Pizza Ordering App

## Value Proposition
Order pizza through conversation - browse the menu, customize orders, and track delivery without leaving ChatGPT.

## Product Context
- **Existing product**: PizzaCo mobile app and website
- **API**: REST API at api.pizzaco.com (OAuth2, 100 req/min)
- **Constraints**: Payment handled via existing PizzaCo account, no credit card input in ChatGPT
```