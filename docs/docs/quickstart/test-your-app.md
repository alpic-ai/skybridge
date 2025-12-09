---
sidebar_position: 2
---

# Test Your App

The best way today to test your App is to connect it to ChatGPT in developer mode.

## Expose your local server

Once your local server is running with `pnpm dev`, expose it with a public URL using ngrok in another terminal:

```bash
ngrok http 3000
```

Copy the forwarding URL from ngrok output (e.g., `https://3785c5ddc4b6.ngrok-free.app`)

## Connect to ChatGPT

1. Enable **Settings → Connectors → Advanced → Developer mode** in the ChatGPT client
2. Navigate to **Settings → Connectors → Create**
3. Enter your ngrok URL with the `/mcp` path (e.g., `https://3785c5ddc4b6.ngrok-free.app/mcp`)
4. Click **Create**

## Test your integration

1. Start a new conversation in ChatGPT
2. Select your newly created connector using **the + button → Your connector**
3. Try prompting the model (e.g., "Show me pikachu details")

## Develop with HMR

Thanks to our Vite plugin, you can edit React components in `web/src/widgets` and see changes instantly:
- Make changes to any component
- Save the file
- The widget will automatically update in ChatGPT without refreshing or reconnecting
- The Express server and MCP server continue running without interruption

**Note:** When you modify widget components, changes will be reflected immediately. If you modify MCP server code (in `server/`), you may need to reload your connector in **Settings → Connectors → [Your connector] → Refresh**.

## Test with a local emulator

You can also test your ChatGPT App with local emulators like [MCPJam Inspector](https://github.com/MCPJam/inspector).

## What's next?

Now that you have Skybridge running, dive deeper into the framework:

<div className="card-grid">
  <div className="card">
    <h3>💡 MCP and ChatGPT Apps Fundamentals</h3>
    <p>Learn the fundamentals of MCP servers and ChatGPT Apps</p>
    <a href="/mcp-and-chatgpt-fundamentals" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>🔄 Skybridge Core Concepts</h3>
    <p>Learn how Skybridge extends the raw APIs with React hooks</p>
    <a href="/skybridge-core-concepts" className="card-link">Explore →</a>
  </div>
  
  <div className="card">
    <h3>📚 API Reference</h3>
    <p>Discover all available hooks and utilities</p>
    <a href="/api-reference" className="card-link">Browse API →</a>
  </div>
</div>

