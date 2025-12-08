---
sidebar_position: 1
title: Introduction
slug: /
---

# Introduction

**Skybridge is a modular framework for quickly building ChatGPT apps, the _modern TypeScript way_.**

## Why does Skybridge exist?

OpenAI announced the [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk) in October 2025, giving developers a new way of interacting with ChatGPT. While it provides powerful primitives with UI rendering, state persistence, tool calls, follow-up messages and layout management, it is very low-level and lacks modern fullstack DX standards like end-to-end typesafe APIs, hooks, error handling or data state management.

In addition, ChatGPT Apps introduce a new challenge: building apps for **dual interaction surfaces**. With Apps interacting with both the user and the model, you need to make sure everything the user sees and does in the UI is also shared with the model, and vice-versa.

Finally, there are no developer tools or environment. Developers can test their apps only inside ChatGPT Developer mode, which has infinite caching policies, no hot module reload, and requires you to refresh or re-install your app to test any change - losing minutes at each small iteration.

After building dozens of ChatGPT Apps, we quickly saw repeating patterns and frustrations, and realized developers were spending too much time stitching together SDKs and managing low-level wiring instead of focusing on their product.

We built Skybridge to avoid these frustrations to other developers, adding back the full-stack development standards into ChatGPT Apps, while accelerating their time-to-production-app.


## What is Skybridge?

Skybridge is a _modular_ framework aiming to **maximize Developer Experience while minimizing boilerplate code** while building your ChatGPT Apps.

It includes 3 main components:
- **`skybridge/server`**: A drop-in replacement for the official MCP SDK that adds widget registration and type inference capabilities.
- **`skybridge/web`**: A React library providing hooks, components, and the runtime glue to render your widgets inside ChatGPT's iframe environment. 
- a **local Dev Environment**: our Vite plugin adds Hot Module Reload to your ChatGPT Apps, with optimized assets building for both local and production environments.


**Skybridge** bridges the gap between standard **MCP servers** and **OpenAI APIs**, allowing you to build rich, React-based UI experiences directly within ChatGPT conversations—all with full type safety and a developer experience you'll love.

## What Skybridge is NOT

- **It is NOT another MCP SDK.** `skybridge/server` simply extends the official [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), and `skybridge/web` focuses on improving the ChatGPT Apps API, making it compatible with any MCP Server and runtime.
- **It is NOT a full-stack framework.** Skybridge provides React extensions and tooling, but you can use it alongside your favorite frameworks and libraries.
- **It is NOT a hosting platform.** You deploy your app wherever you want—Vercel, Cloudflare, Alpic, or your own infrastructure.

## Get Started

Ready to build your first ChatGPT App with Skybridge? Choose your path:

<div className="card-grid">
  <div className="card">
    <h3>🚀 Create New App</h3>
    <p>Start from scratch with our starter kit. Get up and running in 5 minutes with our dev server and HMR.</p>
    <a href="/quickstart/create-new-app" className="card-link">Get Started →</a>
  </div>
  
  <div className="card">
    <h3>➕ Add to Existing App</h3>
    <p>Already have an MCP server? Add Skybridge to enable our React helpers and widgets abstractions.</p>
    <a href="/quickstart/add-to-existing-app" className="card-link">Migrate Now →</a>
  </div>
</div>

## Want to dig deeper?

<div className="card-grid">
  <div className="card">
    <h3>💡 Core Concepts</h3>
    <p>Understand how MCP, ChatGPT Apps, and Skybridge work together</p>
    <a href="/concepts" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>🔄 Skybridge Abstractions</h3>
    <p>Learn how Skybridge extends the raw OpenAI APIs with React hooks and utilities</p>
    <a href="/skybridge-abstractions" className="card-link">Explore →</a>
  </div>
</div>
