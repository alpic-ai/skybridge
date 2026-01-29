# Open external links

- "Open in App" button URL → `useSetOpenInAppUrl`
- External redirect → `useOpenExternal`

## "Open in App" button

Top right corner in fullscreen mode. Must have same origin as widget server (default). Set programmatically.

**Example**:
```tsx
import { useSetOpenInAppUrl } from "skybridge/web";
import { useEffect } from "react";

function ProductDetail({ productId }: { productId: string }) {
  const setOpenInAppUrl = useSetOpenInAppUrl();

  useEffect(() => {
    setOpenInAppUrl(`https://example.com/products/${productId}`).catch(console.error);
  }, [productId]);

  return <div>{/* Product details */}</div>;
}
```

## External redirect

**Example**:
```tsx
import { useOpenExternal } from "skybridge/web";

function ExternalLink() {
  const openExternal = useOpenExternal();

  return (
    <button onClick={() => openExternal("https://example.com")}>
      Visit Website
    </button>
  );
}
```

Shows confirmation dialog unless domain is whitelisted:

```typescript
// server/src/index.ts
server.registerWidget(
  "search-flights",
  {
    description: "Search for flights",
    _meta: {
      ui: {
        csp: {
          redirectDomains: ["https://some-airline.com"],
        },
      },
    },
  },
  { inputSchema: { destination: z.string(), dates: z.string() } },
  async ({ destination, dates }) => { /* ... */ }
);
```
