# Download file

Save content to the user's filesystem → `useDownload`

Views run in sandboxed iframes where `<a download>` and `URL.createObjectURL` are blocked. `useDownload` asks the host to perform the save; the host shows a confirmation dialog first.

> MCP Apps only. On ChatGPT (Apps SDK), use `useFiles` to work with attachments instead.

## Inline text (CSV, JSON, markdown)

```tsx
import { useDownload } from "skybridge/web";

function ExportButton({ rows }: { rows: Row[] }) {
  const { download } = useDownload();

  const handleClick = async () => {
    const csv = rows.map((r) => `${r.id},${r.name}`).join("\n");
    const { isError } = await download({
      contents: [
        {
          type: "resource",
          resource: {
            uri: "file:///orders.csv", // filename hint
            mimeType: "text/csv",
            text: csv,
          },
        },
      ],
    });
    if (isError) {
      // user cancelled or host denied — soft fail, not an exception
    }
  };

  return <button onClick={handleClick}>Export CSV</button>;
}
```

## Inline binary

```tsx
await download({
  contents: [
    {
      type: "resource",
      resource: {
        uri: "file:///chart.png",
        mimeType: "image/png",
        blob: base64EncodedPng,
      },
    },
  ],
});
```

## Resource link (host fetches)

```tsx
await download({
  contents: [
    {
      type: "resource_link",
      uri: "https://api.example.com/reports/q4.pdf",
      name: "Q4 Report",
      mimeType: "application/pdf",
    },
  ],
});
```

## Notes

- Must be user-initiated (button/menu click). Calls from mount effects will be rejected.
- The `uri` is a filename hint; the host derives the suggested save name from the last path segment.
- `isError: true` is a soft signal (user cancelled / host denied). Transport errors throw.
- For binary content above a few hundred KB, prefer `resource_link` over inline base64.
