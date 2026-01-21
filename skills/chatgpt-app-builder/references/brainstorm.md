# Brainstorming Workflow

Help users validate and refine their ChatGPT app idea before implementation. Be brief - only go deep when there are issues to address.
Brainstorming is about validating the idea, not planning implementation. Do not define tools, ask for API schemas, or discuss technical details. Keep it high level.

## 1. Explore the idea

Start conversationally. Understand:
- What problem does this solve?
- Who is the target user?
- What actions/data does it involve?
- What exists today (website, API, product)?

Ask clarifying questions naturally. Surface issues as they arise. Don't over-explain when things look good.

## 2. Validate against UX principles

Creating a great ChatGPT app is about delivering a focused, conversational experience that feels native to ChatGPT.
The goal is to design experiences that feel consistent and useful while extending what can be done in ChatGPT conversations in ways that add real value.
Good examples include booking a ride, ordering food, checking availability, or tracking a delivery. These are tasks that are conversational, time bound, and easy to summarize visually with a clear call to action. Poor examples include replicating long form content from a website, requiring complex multi step workflows, or using the space for ads or irrelevant messaging.
Use the UX principles below to guide development.

An app should do at least one thing _better_ because it lives in ChatGPT:

- **Conversational leverage** – natural language, thread context, and multi-turn guidance unlock workflows that traditional UI cannot.
- **Native fit** – the app feels embedded in ChatGPT, with seamless hand-offs between the model and the app.
- **Composability** – actions are small, reusable building blocks that the model can mix with other apps to complete richer tasks.

If the user cannot describe the clear benefit of running inside ChatGPT, keep iterating before starting implementation.

On the other hand, the app should also _improve the user experience_ in ChatGPT by either providing something new to know, new to do, or a better way to show information.

Below are a few principles to help ensure the app is a great fit for ChatGPT:

### a. Extract, don’t port

Focus on the core jobs users use the product for. Instead of mirroring a full website or native app, identify a few atomic actions that work well in conversation.

### b. Design for conversational entry

Expect users to arrive mid-conversation, with a specific task in mind, or with fuzzy intent. The app should handle both open-ended prompts and direct commands.

### c. Lean on the conversation

ChatGPT provides the conversational surface. Use UI only when it meaningfully improves clarity or captures input - otherwise let the conversation do the work.

### d. Embrace the ecosystem moment

Highlight what is unique about the app inside ChatGPT:

- Accept rich natural language instead of form fields.
- Personalize with relevant context gleaned from the conversation.
- (Optional) Compose with other apps when it saves the user time or cognitive load.

## Quick validation checks

Beyond the principles above, verify:

- **Beyond base ChatGPT** – Does the app provide something users cannot achieve without it (proprietary data, specialized UI, or a guided flow)?
- **Helpful UI only** – Would replacing custom widgets with plain text meaningfully degrade the experience?
- **Discoverability** – Is it easy to imagine prompts where the model would confidently select this app?
- **No sensitive data exposure** – Avoid surfacing private information in cards where others might see it.
- **No system duplication** – Don't recreate ChatGPT's built-in functions (like the input composer).

Use these checks internally. When answering the user, don't list what's right—focus on what needs improvement.

## 3. Pivot if needed

If the idea doesn't fit well:
1. Explain the specific issues (which criteria fail and why)
2. Offer to help reshape the idea
3. Suggest pivot strategies:
   - Scope reduction (extract conversational core)
   - Action atomization (break into discrete actions)
   - Value reframe (solve specific problem vs port entire app)
   - Data-first (start with unique data/actions available)
4. Keep iterating until the idea is sufficiently refined to move on.

## 4. Wrapping up

Once the idea is validated, briefly recap what will be built, list any pending questions, and offer to move on to implementation.

Examples:
- "Alright, we're building a pizza ordering app - browse menu, place orders, track delivery. Still need to clarify how payment works, but we can figure that out as we go. Ready to start implementing?"
- "So the idea is a contract template finder for your law firm - attorneys describe what they need and get the right template back. Makes sense for ChatGPT since natural language beats browsing folders. Want to move on to building it?"