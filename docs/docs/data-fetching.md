---
sidebar_position: 3
---

# Data fetching

Widgets are rendered inside an iframe inline with the conversation on ChatGPT. They are hydrated with the initial tool call result that triggered the widget rendering. Once your component is mounted, it can send requests additional requests in concordance with the iframe CSP.

One way your widget can request additional data is by calling tools on your MCP server.
The `useCallTool` hook exported by `skybridge/web` is a wrapper of the underlying `window.openai.callTool` function. This way of requesting data is the preferred way and is guaranteed to be allowed by the iframe CSP.

## When to use

You should use this hook in reaction to a user action on your widget. Do NOT wrap this hook in a `useEffect` hook to call a tool when the widget is mounted.

## Example

```tsx
import { useCallTool } from "skybridge/web";

type ListPokemonToolArgs = { type: "water" | "fire" | "grass" };
type ListPokemonToolResponse = {
  structuredContent: {
    pokemonsCount: number;
    pokemon: {
      name: string;
    }[];
  };
};

export const TestTool: React.FunctionComponent = () => {
  const { callTool, isPending, data } = useCallTool<
    ListPokemonToolArgs,
    ListPokemonToolResponse
  >("listPokemon");

  return (
    <div>
      <p>Pokemon count: {data?.structuredContent.pokemonsCount}</p>
      <button disabled={isPending} onClick={() => callTool({ type: "water" })}>
        Count all water pokemons
      </button>
    </div>
  );
};
```
