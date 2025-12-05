import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ReactNode,
} from "react";

export type DataLLMContent = string;

export interface DataLLMNode {
  id: string;
  parentId: string | null;
  content: string | null;
}

export const WIDGET_CONTEXT_KEY = "__widget_context" as const;

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
  window.openai.setWidgetState({
    ...window.openai.widgetState,
    [WIDGET_CONTEXT_KEY]: description,
  });
}

const ParentIdContext = createContext<string | null>(null);

interface DataLLMProps {
  content: DataLLMContent | null | undefined;
  children?: ReactNode;
}

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
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  const lines: string[] = [];

  function traverseTree(parentId: string | null, depth: number) {
    const children = byParent.get(parentId);
    if (!children) return;

    for (const child of children) {
      if (child.content && child.content.trim()) {
        const indent = "  ".repeat(depth);
        lines.push(`${indent}- ${child.content.trim()}`);
      }
      traverseTree(child.id, depth + 1);
    }
  }

  traverseTree(null, 0);

  return lines.join("\n");
}
