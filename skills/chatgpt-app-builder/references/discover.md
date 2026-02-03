# Discovery Workflow

**Goal: Idea maturation, not speed.**

**Proceed in phases.** Even if the user provides details, complete each phase through conversation. Do not infer or assume but discuss and validate with user. Proceed one phase at a time—do not write SPEC.md nor proceed to implementation until all phases are validated.

---

## Phase 1: Value Proposition

1. **Problem + User**: What problem? For whom?
2. **Pain**: How solved today? What's painful?
3. **Core actions**: 1-3 focused actions (not a full app port)

---

## Phase 2: Why ChatGPT?

1. **Conversational win**: Where does "just say it" beat clicking?
2. **LLM adds**: What does the LLM contribute? (intent, generation, reasoning)
3. **ChatGPT lacks**: Your data? APIs? Ability to take real actions?

**Fail patterns** (stop if any match):
- Long-form or static content better suited for a website
- Complex multi-step workflows that exceed display modes
- Dashboards (use tables, lists, or short paragraphs instead)
- Full app ports instead of focused atomic actions
- No clear answer to "why inside ChatGPT vs standalone?"

→ If fails: explain gap, suggest different interface or narrower scope.

---

## Phase 3: UI Overview

Describe the user journey through core actions:

1. **First view**: What does the user see when they start?
2. **Key interactions**: What happens at each core action?
3. **End state**: How does the experience conclude?

---

## Phase 4: Product Context

Gather: existing products, APIs/data, auth method, constraints.

---

## Phase 5: Create SPEC.md

**Only after phases 1-4 are discussed and validated with the user.** Do not write SPEC.md from the initial query alone.

Assemble from phases. Target: cwd if empty, else `{app-name}/`.

### Example

```markdown
---
name: pizzaco-chatgpt
description: Use the `chatgpt-app-builder` Skill to update this project.
---

# Pizza Ordering App

## Value Proposition
Order pizza through conversation. Target: PizzaCo customers wanting quick orders. Pain: navigating menus is slower than describing what you want.

**Core actions**: Browse menu, customize order, track delivery.

## Why ChatGPT?
**Conversational win**: "My usual but with mushrooms" = one sentence vs. multiple screens.
**LLM adds**: Intent from natural descriptions, handles modifications.
**ChatGPT lacks**: Real menu and pricing data, order placement.

## UI Overview
**First view**: Popular pizzas with quick "reorder last" option.
**Browsing**: Menu with categories, filters, and customization options.
**Checkout**: Order summary, confirm, and place order.
**Tracking**: Live delivery status with ETA and map.

## Product Context
- **Existing products**: Mobile app, website
- **API**: REST at api.pizzaco.com (OAuth2, 100 req/min)
- **Auth**: PizzaCo account (OAuth2)
- **Constraints**: Payment via existing account only
```

After SPEC.md is created, confirm with user before proceeding to implementation.
