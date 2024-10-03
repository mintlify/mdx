import { toString } from "hast-util-to-string";
import { RefractorElement } from "refractor";
import { refractor } from "refractor/lib/all.js";
import { Parent } from "unist";
import { visit } from "unist-util-visit";

export type RehypeSyntaxHighlightingOptions = {
  ignoreMissing?: boolean;
  alias?: Record<string, string[]>;
};

export type TreeNode = RefractorElement & {
  type: "element" | "text";
  properties: {
    className?: string[];
  };
};

export type TreeParent = Parent & {
  tagName: string;
  properties: {
    className?: string[];
  };
};

export const rehypeSyntaxHighlighting = (
  options: RehypeSyntaxHighlightingOptions
) => {
  if (options.alias) {
    refractor.alias(options.alias);
  }

  return (tree: Parent) => {
    visit(tree, "element", (node: TreeNode, _index, parent?: TreeParent) => {
      if (!parent || parent.tagName !== "pre" || node.tagName !== "code") {
        return;
      }

      const lang = getLanguage(node);
      const linesToHighlight = getLineHighlight(node);

      if (lang === null) {
        return;
      }

      let result;
      try {
        parent.properties.className = (
          parent.properties.className || []
        ).concat("language-" + lang);
        const code = toString(node);

        const nodes = code
          .split("\n")
          .reduce((acc: RefractorElement[], line: string, index: number) => {
            const node: TreeNode = {
              type: "element",
              tagName: "span",
              properties: {
                className: [
                  "line",
                  line.trim() !== "" && linesToHighlight?.includes(index)
                    ? "line-highlight"
                    : "",
                ],
              },
              children: refractor.highlight(line, lang).children,
            };
            acc.push(node);
            acc.push({ type: "text", tagName: "code", value: "\n" } as any);
            return acc;
          }, []);

        node.children = nodes;
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

function getLanguage(node: TreeNode) {
  const className = node.properties?.className || [];

  for (const classListItem of className) {
    if (classListItem.slice(0, 9) === "language-") {
      return classListItem.slice(9).toLowerCase();
    }
  }

  return null;
}

function getLineHighlight(node: TreeNode) {
  const meta = node.data?.meta as string | undefined;
  if (!meta) return null;

  const match = meta.match(/^\{(.+)\}$/);
  if (!match) return null;

  const content = match[1]?.trim();

  const parts = content?.split(",");
  const lineNumbers: number[] = [];

  parts?.forEach((part) => {
    const range = part.split("-").map((num) => parseInt(num, 10));
    if (!range?.[0] || isNaN(range[0])) return;
    lineNumbers.push(Math.max(0, range[0] - 1));

    if (!range?.[1] || isNaN(range[1])) return;

    const start = Math.min(range[0], range[1]);
    const end = Math.max(range[0], range[1]);
    for (let i = start; i <= end; i++) {
      lineNumbers.push(Math.max(0, i - 1));
    }
  });

  return lineNumbers.length > 0
    ? [...new Set(lineNumbers)].sort((a, b) => a - b)
    : null;
}
