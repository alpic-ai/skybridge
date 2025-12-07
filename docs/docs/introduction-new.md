---
sidebar_position: 1
title: Introduction
slug: /introduction-new
---

# Introduction

**Skybridge is a modular framework for quickly building ChatGPT apps, the _modern TypeScript way_.**

## Why does Skybridge exist?

OpenAI announced the [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk) in October 2025, giving developers a new way of interacting with ChatGPT. While it provides powerful primitives with UI rendering, state persistence, tool calls, follow-up messages and layout management, it is very low-level and lacks modern frontend DX standards like React hooks, error handling or data state management.

In addition, ChatGPT Apps introduce a new challenge: building apps for **dual interaction surfaces**. With Apps interacting with both the user and the model, you need to make sure everything the user sees and does in the UI is also shared with the model, and vice-versa.

Finally, there are no developer tools or environment. Developers can test their apps only inside ChatGPT Developer mode, which has infinite caching policies, no hot module reload, and requires you to refresh or re-install your app to test any change - losing minutes at each small iteration.

After building dozens of ChatGPT Apps, we quickly saw repeating patterns and frustrations, and realized developers were spending too much time stitching together SDKs and managing low-level wiring instead of focusing on their product.

We built Skybridge to avoid these frustrations to other developers, adding back the frontend development standards into ChatGPT Apps, while accelerating their time-to-production-app.


## What is Skybridge?

Skybridge is a _modular_ framework aiming to **maximize Developer Experience while minimizing boilerplate code** while building your ChatGPT Apps.

It includes 3 main components:
- **`skybridge/server`**: A drop-in replacement for the official MCP SDK that adds widget registration and type inference capabilities.
- **`skybridge/web`**: A React library providing hooks, components, and the runtime glue to render your widgets inside ChatGPT's iframe environment. 
- a **local Dev Environment**: our Vite plugin adds Hot Module Reload to your ChatGPT Apps, with optimized assets building for both local and production environments.


**Skybridge** bridges the gap between standard **MCP servers** and **OpenAI APIs**, allowing you to build rich, React-based UI experiences directly within ChatGPT conversations—all with full type safety and a developer experience you'll love.

## What Skybridge is NOT

- **It is NOT another MCP SDK.** `skybridge/server` simply extends the official [Typescript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), and `skybridge/web` only focuses on improving ChatGPT Apps API, making it compatible with any MCP Server and runtime.
- **It is NOT another frontend full-stack framework.** Skybridge provides React extensions, allowing you to use your favorite app.
- **NEEDS MORE HERE ?**

## Getting Started

The fastest way to start is using our starter template. It comes pre-configured with the server, the web client, and full TypeScript setup.

### Quick Start

Create a new repository from our template:

[**➡️ Use the ChatGPT SDK Template**](https://github.com/new?template_name=apps-sdk-template&template_owner=alpic-ai)

Or clone it manually:

```bash
git clone https://github.com/alpic-ai/apps-sdk-template my-chatgpt-app
cd my-chatgpt-app
pnpm install
```

Start the development server:

```bash
pnpm dev
```

You're now ready to build your first widget! Check out the [Interaction Model](/docs/interaction-model) to understand how tools and widgets work together.
