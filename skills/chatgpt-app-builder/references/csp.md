# Content Security Policy

Views run in sandboxed iframes with strict CSP. Whitelist external domains in view definition `_meta.ui.csp`:

| Property | Purpose |
|----------|---------|
| `connectDomains` | Fetch/XHR requests to external APIs |
| `resourceDomains` | Static assets (images, fonts, scripts, styles) |
| `redirectDomains` | (optional) `openExternal` destinations without safe-link modal |
| `frameDomains` | (optional) Iframe embeds — triggers stricter review |

```typescript
server.registerView(
  "search-flights",
  {
    description: "Search flights",
    _meta: {
      ui: {
        csp: {
          connectDomains: ["https://api.example.com"],
          resourceDomains: ["https://cdn.example.com"],
          frameDomains: ["https://maps.example.com"],
          redirectDomains: ["https://checkout.example.com"],
        },
      },
    },
  },
  { inputSchema: { ... } },
  async (input) => ({ ... })
);
```

Skybridge auto-includes the server's domain. Only add external domains.
