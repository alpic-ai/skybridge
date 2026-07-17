import { sprinkles, text } from "../design/tokens";

/** Centered message shown when there is nothing to render (e.g. no results). */
export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className={sprinkles({ p: "l", textAlign: "center", color: "subtle" })}
    >
      <p className={text({ style: "bodyM" })}>{message}</p>
    </div>
  );
}
