import { rendererRich, type TransformerTwoslashOptions } from '@shikijs/twoslash';
import type { Element, ElementContent } from 'hast';
import type { Code } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { defaultHandlers, toHast } from 'mdast-util-to-hast';
import type { ShikiTransformerContextCommon } from 'shiki/types';
import ts from 'typescript';

const twoslashCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  lib: ['ESNext', 'DOM', 'esnext', 'dom', 'es2020'],
};

function onTwoslashError(err: unknown, code: string, lang: string) {
  console.error(JSON.stringify({ err, code, lang }));
}

function onShikiError(err: unknown, code: string, lang: string) {
  console.error(JSON.stringify({ err, code, lang }));
}

export function getTwoslashOptions(
  { linkMap }: { linkMap: Map<string, string> } = { linkMap: new Map() }
): TransformerTwoslashOptions {
  return {
    onTwoslashError,
    onShikiError,
    // copied fuma's approach for custom popup
    // https://github.com/fuma-nama/fumadocs/blob/dev/packages/twoslash/src/index.ts
    renderer: rendererRich({
      renderMarkdown,
      renderMarkdownInline,
      queryRendering: 'line',
      hast: {
        hoverToken: {
          tagName: 'Popup',
          children(input) {
            for (const rootElement of input) {
              if (!('children' in rootElement)) continue;
              for (const [i, element] of rootElement.children.entries()) {
                if (element.type !== 'text') continue;
                const href = linkMap.get(element.value);
                if (!href) continue;
                const newElement: ElementContent = {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href,
                    ...(checkIsExternalLink(href) && {
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    }),
                  },
                  children: [{ type: 'text', value: element.value }],
                };
                input.splice(i, 1, newElement);
              }
            }
            return input;
          },
        },
        hoverPopup: {
          tagName: 'PopupContent',
        },
        hoverCompose: ({ popup, token }) => [
          popup,
          {
            type: 'element',
            tagName: 'PopupTrigger',
            properties: {},
            children: [token],
          },
        ],
        popupDocs: {
          class: 'prose twoslash-popup-docs',
        },
        popupTypes: {
          tagName: 'div',
          class: 'mint-twoslash-popover-pre',
          children: (v) => {
            if (v.length === 1 && v[0]?.type === 'element' && v[0]?.tagName === 'pre') return v;

            return [
              {
                type: 'element',
                tagName: 'code',
                properties: {
                  class: 'twoslash-popup-code',
                },
                children: v,
              },
            ];
          },
        },
        popupDocsTags: {
          class: 'prose twoslash-popup-docs twoslash-popup-docs-tags',
        },
        nodesHighlight: {
          class: 'highlighted-word twoslash-highlighted',
        },
      },
    }),
    langs: ['ts', 'typescript', 'js', 'javascript', 'tsx', 'jsx'],
    explicitTrigger: /mint-twoslash/,
    twoslashOptions: {
      compilerOptions: twoslashCompilerOptions,
    },
  };
}

/** https://github.com/fuma-nama/fumadocs/blob/2862a10c2d78b52c0a3f479ad21b255cc0031fc9/packages/twoslash/src/index.ts#L121-L150 */
function renderMarkdown(this: ShikiTransformerContextCommon, md: string): ElementContent[] {
  const mdast = fromMarkdown(
    md.replace(/{@link (?<link>[^}]*)}/g, '$1'), // replace jsdoc links
    { mdastExtensions: [gfmFromMarkdown()] }
  );

  return (
    toHast(mdast, {
      handlers: {
        code: (state, node: Code) => {
          if (node.lang) {
            return this.codeToHast(node.value, {
              ...this.options,
              transformers: [],
              meta: {
                __raw: node.meta ?? undefined,
              },
              lang: node.lang,
            }).children[0] as Element;
          }
          return defaultHandlers.code(state, node);
        },
      },
    }) as Element
  ).children;
}

/** https://github.com/fuma-nama/fumadocs/blob/2862a10c2d78b52c0a3f479ad21b255cc0031fc9/packages/twoslash/src/index.ts#L152-L168 */
function renderMarkdownInline(
  this: ShikiTransformerContextCommon,
  md: string,
  context?: string
): ElementContent[] {
  const text = context === 'tag:param' ? md.replace(/^(?<link>[\w$-]+)/, '`$1` ') : md;

  const children = renderMarkdown.call(this, text);
  if (children.length === 1 && children[0]?.type === 'element' && children[0].tagName === 'p')
    return children[0].children;
  return children;
}

export function parseLineComment(line: string): { word: string; href: string } | undefined {
  line = line.trim();
  if (!line.startsWith('//')) return;

  line = line.replace(/^[\/\s]+/, '').trim();
  if (!line.startsWith('@link ') && !line.startsWith('@link:')) return;

  line = line.replace('@link:', '@link ');
  const parts = line.split('@link ')[1];
  if (!parts) return;

  const words = parts.split(' ').filter(Boolean);
  if (words.length === 1 && words[0]) {
    let word = words[0];
    if (word.endsWith(':')) word = word.slice(0, -1);
    const lowercaseWord = word.toLowerCase();
    const href = word.startsWith('#') ? lowercaseWord : `#${encodeURIComponent(lowercaseWord)}`;
    return { word, href };
  } else if (words.length === 2 && words[0] && words[1]) {
    let word = words[0];
    if (word.endsWith(':')) word = word.slice(0, -1);
    const href = words[1];
    if (!href.startsWith('#') && !href.startsWith('https://')) return;
    return { word, href };
  }

  return;
}

type Url = `https://${string}`;
function checkIsExternalLink(href: string | undefined): href is Url {
  let isExternalLink = false;
  try {
    if (href && URL.canParse(href)) isExternalLink = true;
  } catch {}
  return isExternalLink;
}
