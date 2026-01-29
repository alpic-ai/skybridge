# Control display modes

## Display modes

| Mode | Position | Persistence | Chat access | Use for |
|------|----------|-------------|-------------|---------|
| `inline` (default) | Before model response | Per invocation | Full | Single action, structured data, quick status |
| `pip` | Floating, fixed on scroll | Until closed | Partial | Games, collaboration, learning |
| `fullscreen` | Whole screen | Until closed | Composer only | Rich canvas, browsing, explorable content |
| `modal` | Overlay | Until dismissed | Blocked | Focused input, confirmations |

Widgets always start in inline mode. Widget implements switch controls, user clicks to change mode. Each invocation creates a new instance with its own state.

- inline, pip, fullscreen → `useDisplayMode`
- modal → `useRequestModal`

## Read and switch modes

**Example:**
```jsx
import { useDisplayMode } from "skybridge/web";

function ChartWidget({ data }) {
  const [displayMode, setDisplayMode] = useDisplayMode();

  if (displayMode === "inline") {
    return (
      <div>
        <MiniChart data={data} />
        <button onClick={() => setDisplayMode("fullscreen")}>Expand</button>
      </div>
    );
  }

  return (
    <div>
      <FullChart data={data} />
      <button onClick={() => setDisplayMode("inline")}>Collapse</button>
    </div>
  );
}
```

## Open modals

Check `isOpen` at widget root and return modal content early. Use params to pass data to the modal.

**Example:**
```jsx
import { useRequestModal } from "skybridge/web";

function ProductList({ products }) {
  const { open, isOpen, params } = useRequestModal();

  if (isOpen) {
    return <ProductDetails product={params.product} />;
  }

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id} onClick={() => open({ params: { product } })}>
          {product.name}
        </li>
      ))}
    </ul>
  );
}
```
