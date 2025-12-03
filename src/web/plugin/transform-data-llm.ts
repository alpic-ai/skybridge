import type { PluginObj, TransformOptions, types } from "@babel/core";

const LLM_IMPORT_SOURCE = "skybridge/web";

interface State {
  hasDataLLMImport?: boolean;
  needsDataLLMImport?: boolean;
}

function createBabelPlugin(t: typeof types): PluginObj<State> {
  return {
    name: "data-llm-babel",

    visitor: {
      Program: {
        enter(path, state) {
          state.hasDataLLMImport = false;
          state.needsDataLLMImport = false;

          for (const node of path.node.body) {
            if (!t.isImportDeclaration(node)) continue;
            if (node.source.value !== LLM_IMPORT_SOURCE) continue;

            const hasSpecifier = node.specifiers.some(
              (s) =>
                t.isImportSpecifier(s) &&
                t.isIdentifier(s.imported, { name: "DataLLM" })
            );

            if (hasSpecifier) {
              state.hasDataLLMImport = true;
              break;
            }
          }
        },

        exit(path, state) {
          if (state.needsDataLLMImport && !state.hasDataLLMImport) {
            const importDecl = t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier("DataLLM"),
                  t.identifier("DataLLM")
                ),
              ],
              t.stringLiteral(LLM_IMPORT_SOURCE)
            );

            path.node.body.unshift(importDecl);
          }
        },
      },

      JSXElement(path, state) {
        const opening = path.node.openingElement;
        const attrs = opening.attributes;

        const llmAttrIndex = attrs.findIndex(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name, { name: "data-llm" })
        );

        if (llmAttrIndex === -1) return;

        const llmAttr = attrs[llmAttrIndex] as types.JSXAttribute;

        const newAttrs = [...attrs];
        newAttrs.splice(llmAttrIndex, 1);
        opening.attributes = newAttrs;

        let contentExpression: types.Expression;

        if (!llmAttr.value) {
          contentExpression = t.stringLiteral("");
        } else if (t.isStringLiteral(llmAttr.value)) {
          contentExpression = llmAttr.value;
        } else if (t.isJSXExpressionContainer(llmAttr.value)) {
          contentExpression = llmAttr.value.expression as types.Expression;
        } else {
          return;
        }

        const contentAttr = t.jsxAttribute(
          t.jsxIdentifier("content"),
          t.isStringLiteral(contentExpression)
            ? contentExpression
            : t.jsxExpressionContainer(contentExpression)
        );

        const llmOpening = t.jsxOpeningElement(t.jsxIdentifier("DataLLM"), [
          contentAttr,
        ]);
        const llmClosing = t.jsxClosingElement(t.jsxIdentifier("DataLLM"));

        const wrapped = t.jsxElement(
          llmOpening,
          llmClosing,
          [path.node],
          false
        );

        state.needsDataLLMImport = true;
        path.replaceWith(wrapped);
      },
    },
  };
}

export const transform = async (code: string, id: string) => {
  if (!/\.(jsx|tsx)$/.test(id)) {
    return null;
  }

  if (id.includes("node_modules")) {
    return null;
  }

  // Dynamic import to ensure @babel/core is only loaded in Node.js context
  const { types: t, transformSync } = await import("@babel/core");

  const babelOptions: TransformOptions = {
    plugins: [createBabelPlugin(t)],
    parserOpts: {
      plugins: ["jsx", "typescript"],
    },
    filename: id,
    sourceFileName: id,
  };

  const result = transformSync(code, babelOptions);

  if (!result || !result.code) {
    return null;
  }

  return {
    code: result.code,
    map: result.map || null,
  };
};
