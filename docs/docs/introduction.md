---
sidebar_position: 1
title: Introduction
slug: /
---

# Introduction

**Skybridge is a modular framework for quickly building ChatGPT apps, the _modern TypeScript way_.** 

It comes with: 
- 👨‍💻 Full blown dev environment with HMR, debug traces, and emulator
- ✅ End-to-end typesafe APIs
- 🔄 Widget-to-model synchronization tooling
- ⚒️ React-query and Zustand-like state management hooks



## Why does Skybridge exist?

OpenAI announced the [ChatGPT Apps SDK](https://developers.openai.com/apps-sdk) in October 2025, giving developers a new way of interacting with ChatGPT. While it provides powerful primitives with UI rendering, state persistence, tool calls, follow-up messages and layout management, it is very low-level and lacks modern fullstack DX standards like end-to-end typesafe APIs, hooks, error handling or data state management.

In addition, ChatGPT Apps introduce a new challenge: building apps for **dual interaction surfaces**. With Apps interacting with both the user and the model, you need to make sure everything the user sees and does in the UI is also shared with the model, and vice-versa.

<img src="/img/chatgpt-apps-interaction.png" alt="ChatGPT Apps architecture" style={{maxWidth: '500px', width: '100%', display: 'block', margin: '0 auto'}} />


Finally, there are no developer tools or environment. Developers can test their apps only inside ChatGPT Developer mode, which has infinite caching policies, no hot module replacement, and requires you to refresh or re-install your app to test any change - losing precious minutes at each small iteration.

After building dozens of ChatGPT Apps, we quickly saw repeating patterns and frustrations, and realized developers were spending too much time stitching together SDKs and managing low-level wiring instead of focusing on their product.

We built Skybridge so other developers wouldn’t have to deal with these same frustrations. Our goal is to bring full-stack development standards back into ChatGPT Apps and help teams ship production-ready apps much faster.


## What is Skybridge?

Skybridge is a _modular_ ChatGPT Apps framework aiming to **maximize Developer Experience while minimizing boilerplate code**.

It includes 3 main parts:
- **`skybridge/server`**: A drop-in replacement for the official MCP SDK that adds widget registration and type inference capabilities.
- **`skybridge/web`**: A React library providing hooks, components, and the runtime glue to render your widgets inside ChatGPT's iframe environment. 
- a **local Dev Environment**: our Vite plugin adds Hot Module Reload to your ChatGPT Apps, with optimized assets building for both local and production environments.


**Skybridge** bridges the gap between standard **MCP servers** and [**OpenAI APIs**](https://developers.openai.com/apps-sdk/reference/), allowing you to build rich, React-based UI experiences directly within ChatGPT conversations—all with full type safety and a developer experience you'll love.

## What Skybridge is NOT

- **It is NOT another MCP SDK.** `skybridge/server` simply extends the official [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), and `skybridge/web` focuses on improving the ChatGPT Apps APIs, making it compatible with any MCP Server and runtime.

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
    <h3>💡 MCP and ChatGPT Apps Fundamentals</h3>
    <p>Learn the fundamentals of MCP servers and ChatGPT Apps</p>
    <a href="/mcp-and-chatgpt-fundamentals" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>🔄 Skybridge Core Concepts</h3>
    <p>Learn how Skybridge extends the raw OpenAI APIs with React hooks and utilities</p>
    <a href="/skybridge-core-concepts" className="card-link">Explore →</a>
  </div>
</div>
