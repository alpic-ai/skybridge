import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ReactNode,
} from "react";

export type LLMDescribeContent = string;

export interface LLMDescribeNode {
  id: string;
  parentId: string | null;
  content: string | null;
}

const nodes = new Map<string, LLMDescribeNode>();

function setNode(node: LLMDescribeNode) {
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
    __widget_context: description,
  });
}

const ParentIdContext = createContext<string | null>(null);

interface LLMDescribeProps {
  content: LLMDescribeContent | null | undefined;
  children?: ReactNode;
}

export function LLMDescribe({ content, children }: LLMDescribeProps) {
  const parentId = useContext(ParentIdContext);
  const id = useId();

  useEffect(() => {
    setNode({
      id,
      parentId,
      content: content ?? null,
    });

    return () => {
      removeNode(id);
    };
  }, [id, parentId, content]);

  return (
    <ParentIdContext.Provider value={id}>{children}</ParentIdContext.Provider>
  );
}

function getLLMDescriptionString(): string {
  const byParent = new Map<string | null, LLMDescribeNode[]>();
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
