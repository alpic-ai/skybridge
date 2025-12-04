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
        const attributes = opening.attributes;

        const llmAttributeIndex = attributes.findIndex(
          (attribute) =>
            t.isJSXAttribute(attribute) &&
            t.isJSXIdentifier(attribute.name, { name: "data-llm" })
        );

        if (llmAttributeIndex === -1) return;

        const llmAttribute = attributes[
          llmAttributeIndex
        ] as types.JSXAttribute;

        let contentExpression: types.Expression;

        if (t.isStringLiteral(llmAttribute.value)) {
          contentExpression = llmAttribute.value;
        } else if (t.isJSXExpressionContainer(llmAttribute.value)) {
          contentExpression = llmAttribute.value.expression as types.Expression;
        } else {
          return;
        }

        const contentAttr = t.jsxAttribute(
          t.jsxIdentifier("content"),
          t.isStringLiteral(contentExpression)
            ? contentExpression
            : t.jsxExpressionContainer(contentExpression)
        );

        const filteredAttributes = attributes.filter(
          (_, index) => index !== llmAttributeIndex
        );
        const newOpening = t.jsxOpeningElement(
          opening.name,
          filteredAttributes,
          opening.selfClosing
        );

        const elementWithoutLlm = t.jsxElement(
          newOpening,
          path.node.closingElement,
          path.node.children,
          path.node.selfClosing
        );

        const llmOpening = t.jsxOpeningElement(t.jsxIdentifier("DataLLM"), [
          contentAttr,
        ]);
        const llmClosing = t.jsxClosingElement(t.jsxIdentifier("DataLLM"));

        const wrapped = t.jsxElement(
          llmOpening,
          llmClosing,
          [elementWithoutLlm],
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
