import { toString } from "hast-util-to-string";
import { refractor } from "refractor/lib/all.js";
import { visit } from "unist-util-visit";
import { Node, Parent } from "unist";
import { Element } from "hast";

const languagePrefix = "language-";

function isElement(node: Node): node is Element {
  return node.type === "element";
}

export const rehypeSyntaxHighlighting = (options: {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
}) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree: Parent) => {
    visit(tree, isElement, (node, _, parent) => {
      if (
        !parent ||
        !isElement(parent) ||
        parent.tagName !== "pre" ||
        node.tagName !== "code"
      ) {
        return;
      }

      const lang = getLanguage(node);

      if (lang === null) {
        return;
      }

      try {
        const existingClassName = parent.properties.className ?? [];
        if (Array.isArray(existingClassName)) {
          parent.properties.className = [
            ...existingClassName,
            languagePrefix + lang,
          ];
        }
        const result = refractor.highlight(toString(node), lang);

        // @ts-expect-error refractor uses outdated version of @types/hast
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
    });
  };
};

function getLanguage(node: Element) {
  const className = node.properties.className || [];
  if (!Array.isArray(className)) {
    return null;
  }

  for (const classListItem of className) {
    if (
      typeof classListItem === "string" &&
      classListItem.startsWith(languagePrefix)
    ) {
      return classListItem.slice(languagePrefix.length).toLowerCase();
    }
  }

  return null;
}
