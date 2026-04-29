# Content Security Policy

Views run in sandboxed iframes with strict CSP. Whitelist external domains on the tool's `view.csp`:

| Property | Purpose |
|----------|---------|
| `connectDomains` | Fetch/XHR requests to external APIs |
| `resourceDomains` | Static assets (images, fonts, scripts, styles) |
| `redirectDomains` | (optional) `openExternal` destinations without safe-link modal |
| `frameDomains` | (optional) Iframe embeds — triggers stricter review |

```typescript
server.registerTool(
  {
    name: "search-flights",
    description: "Search flights",
    inputSchema: { ... },
    view: {
      component: "search-flights",
      csp: {
        connectDomains: ["https://api.example.com"],
        resourceDomains: ["https://cdn.example.com"],
        frameDomains: ["https://maps.example.com"],
        redirectDomains: ["https://checkout.example.com"],
      },
    },
  },
  async (input) => ({ ... }),
);
```

Skybridge auto-includes the server's domain. Only add external domains.
