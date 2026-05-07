# Content Security Policy

Views run in sandboxed iframes with strict CSP. Whitelist external domains via `view.csp` in `registerTool`:

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
      component: "SearchFlights",
      csp: {
        connectDomains: ["https://api.example.com"],
        resourceDomains: ["https://cdn.example.com"],
        frameDomains: ["https://maps.example.com"],
        redirectDomains: ["https://checkout.example.com"],
      },
    },
  },
  async (input) => ({ ... })
);
```

Skybridge auto-includes the server's domain. Only add external domains.
