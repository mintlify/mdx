import { rendererRich, type TransformerTwoslashOptions } from '@shikijs/twoslash';
import type { ElementContent } from 'hast';
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
    renderer: rendererRich({
      hast: {
        hoverToken: {
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
      },
    }),
    langs: ['ts', 'typescript', 'js', 'javascript', 'tsx', 'jsx'],
    explicitTrigger: /mint-twoslash/,
    twoslashOptions: {
      compilerOptions: twoslashCompilerOptions,
    },
  };
}

export function parseLineComment(line: string): { word: string; href: string } | undefined {
  line = line.trim();
  if (!line.startsWith('//') || (!line.includes('@link ') && !line.includes('@link:'))) return;

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
