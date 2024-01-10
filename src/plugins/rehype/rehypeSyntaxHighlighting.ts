import { Node, toString } from "hast-util-to-string";
import { refractor } from "refractor/lib/all.js";
import { visit } from "unist-util-visit";
import { Parent } from "unist";

export const rehypeSyntaxHighlighting = (options: {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
}) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree: Parent) => {
    visit(
      tree,
      "element",
      (
        node: Node & {
          tagName: string;
          children: Node[];
          properties: {
            className?: string[];
          };
        },
        _index,
        parent?: {
          tagName: string;
          properties: {
            className?: string[];
          };
        }
      ) => {
        if (!parent || parent.tagName !== "pre" || node.tagName !== "code") {
          return;
        }

        const lang = getLanguage(node);

        if (lang === null) {
          return;
        }

        let result;
        try {
          parent.properties.className = (
            parent.properties.className || []
          ).concat("language-" + lang);
          result = refractor.highlight(toString(node), lang);
          node.children = result.children;
        } catch (err) {
          if (
            options.ignoreMissing &&
            /Unknown language/.test((err as Error).message)
          ) {
            return;
          }
          throw err;
        }
      }
    );
  };
};

function getLanguage(
  node: Node & {
    tagName: string;
    children: Node[];
    properties: {
      className?: string[];
    };
  }
) {
  const className = node.properties.className || [];

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === "language-") {
      return classListItem.slice(9).toLowerCase();
    }
  }

  return null;
}
