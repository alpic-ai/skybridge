// tools/llm-describe-babel-plugin.ts
import type { PluginObj, TransformOptions } from "@babel/core";
import { transformSync, types as t } from "@babel/core";
import type { Plugin } from "vite";

const LLM_IMPORT_SOURCE = "skybridge/web";

interface State {
  hasLLMDescribeImport?: boolean;
  needsLLMDescribeImport?: boolean;
}

function createBabelPlugin(): PluginObj<State> {
  return {
    name: "llm-describe-babel",

    visitor: {
      Program: {
        enter(path, state) {
          state.hasLLMDescribeImport = false;
          state.needsLLMDescribeImport = false;

          for (const node of path.node.body) {
            if (!t.isImportDeclaration(node)) continue;
            if (node.source.value !== LLM_IMPORT_SOURCE) continue;

            const hasSpecifier = node.specifiers.some(
              (s) =>
                t.isImportSpecifier(s) &&
                t.isIdentifier(s.imported, { name: "LLMDescribe" })
            );

            if (hasSpecifier) {
              state.hasLLMDescribeImport = true;
              break;
            }
          }
        },

        exit(path, state) {
          if (state.needsLLMDescribeImport && !state.hasLLMDescribeImport) {
            const importDecl = t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier("LLMDescribe"),
                  t.identifier("LLMDescribe")
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
            t.isJSXIdentifier(attr.name, { name: "llm-describe" })
        );

        if (llmAttrIndex === -1) return;

        const llmAttr = attrs[llmAttrIndex] as t.JSXAttribute;

        const newAttrs = [...attrs];
        newAttrs.splice(llmAttrIndex, 1);
        opening.attributes = newAttrs;

        let contentExpression: t.Expression;

        if (!llmAttr.value) {
          contentExpression = t.stringLiteral("");
        } else if (t.isStringLiteral(llmAttr.value)) {
          contentExpression = llmAttr.value;
        } else if (t.isJSXExpressionContainer(llmAttr.value)) {
          contentExpression = llmAttr.value.expression as t.Expression;
        } else {
          return;
        }

        const contentAttr = t.jsxAttribute(
          t.jsxIdentifier("content"),
          t.isStringLiteral(contentExpression)
            ? contentExpression
            : t.jsxExpressionContainer(contentExpression)
        );

        const llmOpening = t.jsxOpeningElement(t.jsxIdentifier("LLMDescribe"), [
          contentAttr,
        ]);
        const llmClosing = t.jsxClosingElement(t.jsxIdentifier("LLMDescribe"));

        const wrapped = t.jsxElement(
          llmOpening,
          llmClosing,
          [path.node],
          false
        );

        state.needsLLMDescribeImport = true;
        path.replaceWith(wrapped);
      },
    },
  };
}

export default function describePlugin(): Plugin {
  return {
    name: "llm-describe-vite",
    enforce: "pre",

    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id)) {
        return null;
      }

      if (id.includes("node_modules")) {
        return null;
      }

      const babelOptions: TransformOptions = {
        plugins: [createBabelPlugin()],
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
    },
  };
}
