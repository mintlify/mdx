import {
  rendererRich,
  createTransformerFactory,
  type TransformerTwoslashOptions,
} from '@shikijs/twoslash';
import type { ElementContent } from 'hast';
import type { ShikiTransformer } from 'shiki/types';
import type { TwoslashInstance } from 'twoslash';
import { createTwoslashFromCDN } from 'twoslash-cdn';
import * as ts from 'typescript';

type TransformerFactory = (options?: TransformerTwoslashOptions) => ShikiTransformer;

const twoslashCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  lib: ['ESNext', 'DOM', 'esnext', 'dom', 'es2020'],
  allowJs: true,
  allowSyntheticDefaultImports: true,
  allowUnreachableCode: true,
  alwaysStrict: false,
};

const fsMap: Map<string, string> = new Map();
const twoslashStorageMap = new Map();

export const cdnTwoslash = createTwoslashFromCDN({
  compilerOptions: twoslashCompilerOptions,
  fsMap,
  fetcher(input, init) {
    console.log(`[GLOBAL__FETCHER] Fetching ${input}`);
    return fetch(input, init);
  },
  storage: {
    getItemRaw(key) {
      console.log(`[GLOBAL__STORAGE] Getting ${key}`);
      return twoslashStorageMap.get(key);
    },
    setItemRaw(key, value) {
      console.log(`[GLOBAL__STORAGE] Setting ${key}`);
      twoslashStorageMap.set(key, value);
    },
  },
});

export const cdnTwoslashTransformer: TransformerFactory = createTransformerFactory(
  cdnTwoslash.runSync
);

export function getCdnTwoslashTransformer(options: TransformerTwoslashOptions): ShikiTransformer {
  function getInstance() {
    return createTwoslashFromCDN({
      compilerOptions: twoslashCompilerOptions,
      fetcher(input, init) {
        console.log(`[FETCHER] Fetching ${input}`);
        return fetch(input, init);
      },
      fsMap,
      storage: {
        getItemRaw(key) {
          console.log(`[STORAGE] Getting ${key}`);
          return twoslashStorageMap.get(key);
        },
        setItemRaw(key, value) {
          console.log(`[STORAGE] Setting ${key}`);
          twoslashStorageMap.set(key, value);
        },
      },
    });
  }

  return createTransformerFactory(
    // lazy load Twoslash instance so it works on serverless platforms
    ((...args) => getInstance().runSync(...args)) as TwoslashInstance
  )({
    ...options,
  });
}

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
      tsModule: ts,
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
