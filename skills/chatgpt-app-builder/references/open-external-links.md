# Open external links

- "Open in App" button URL → `useSetOpenInAppUrl`
- External redirect → `useOpenExternal`

## "Open in App" button

Top right corner in fullscreen mode. Set programmatically. If the origin matches the view server URL, ChatGPT navigates to the full href (any path). If the origin differs, ChatGPT falls back to the view server URL.

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


You can control return-path behavior with an optional second argument (ChatGPT only):

```tsx
openExternal("https://example.com", { redirectUrl: false });
```

Use `redirectUrl: false` to skip automatic `?redirectUrl=...` appending.

Shows confirmation dialog unless domain is whitelisted:

```typescript
// server/src/index.ts
server.registerTool(
  {
    name: "search-flights",
    description: "Search for flights",
    inputSchema: { destination: z.string(), dates: z.string() },
    view: {
      component: "search-flights",
      csp: {
        redirectDomains: ["https://airline.example.com"],
      },
    },
  },
  async ({ destination, dates }) => { /* ... */ },
);
```
