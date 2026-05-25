import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
} from "react";
import { getAdaptor } from "./bridges/index.js";

/** Text content surfaced to the model by a {@link DataLLM} component. */
export type DataLLMContent = string;

/**
 * A node in the {@link DataLLM} tree. Nested `<DataLLM>` elements form a
 * hierarchy that is serialized as an indented bullet list for the model.
 */
export interface DataLLMNode {
  id: string;
  parentId: string | null;
  content: string | null;
}

/**
 * Key under which the serialized {@link DataLLM} tree is persisted on the
 * host's `viewState`. The host exposes the value to the model on subsequent
 * turns.
 */
export const VIEW_CONTEXT_KEY = "__view_context" as const;

const nodes = new Map<string, DataLLMNode>();

function setNode(node: DataLLMNode) {
  nodes.set(node.id, node);
  onChange();
}

function removeNode(id: string) {
  nodes.delete(id);
  onChange();
}

function onChange() {
  const description = getLLMDescriptionString();
  const adaptor = getAdaptor();
  adaptor.setViewState((prevState) => ({
    ...prevState,
    [VIEW_CONTEXT_KEY]: description,
  }));
}

const ParentIdContext = createContext<string | null>(null);

interface DataLLMProps {
  content: DataLLMContent | null | undefined;
  children?: ReactNode;
}

/**
 * Surface in-view content to the LLM so it can reason about what the user is
 * seeing without an extra tool call.
 *
 * Each `<DataLLM>` registers `content` as a node in a tree (parented by any
 * enclosing `<DataLLM>`). The flattened tree is serialized as an indented
 * bullet list and persisted on the host's `viewState` under
 * {@link VIEW_CONTEXT_KEY}; the host then surfaces it to the model as part of
 * the next turn's context.
 *
 * Pass `null`/`undefined` for `content` to register only as a structural
 * parent (useful for grouping).
 *
 * @example
 * ```tsx
 * <DataLLM content="Active filters">
 *   <DataLLM content={`Sort: ${sort}`} />
 *   <DataLLM content={`Page: ${page}`} />
 * </DataLLM>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/data-llm
 */
export function DataLLM({ content, children }: DataLLMProps) {
  const parentId = useContext(ParentIdContext);
  const id = useId();

  useEffect(() => {
    if (content) {
      setNode({
        id,
        parentId,
        content,
      });
    } else {
      removeNode(id);
    }

    return () => {
      removeNode(id);
    };
  }, [id, parentId, content]);

  return (
    <ParentIdContext.Provider value={id}>{children}</ParentIdContext.Provider>
  );
}

function getLLMDescriptionString(): string {
  const byParent = new Map<string | null, DataLLMNode[]>();
  for (const node of Array.from(nodes.values())) {
    const key = node.parentId ?? null;
    if (!byParent.has(key)) {
      byParent.set(key, []);
    }
    byParent.get(key)?.push(node);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  const lines: string[] = [];

  function traverseTree(parentId: string | null, depth: number) {
    const children = byParent.get(parentId);
    if (!children) {
      return;
    }

    for (const child of children) {
      if (child.content?.trim()) {
        const indent = "  ".repeat(depth);
        lines.push(`${indent}- ${child.content.trim()}`);
      }
      traverseTree(child.id, depth + 1);
    }
  }

  traverseTree(null, 0);

  return lines.join("\n");
}
