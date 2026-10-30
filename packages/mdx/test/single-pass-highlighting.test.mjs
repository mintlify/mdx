import assert from 'node:assert/strict';
import test from 'node:test';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { createHighlighter } from 'shiki';

import { rehypeSyntaxHighlighting } from '../dist/plugins/index.js';
import { shellPlaceholderTransformer } from '../dist/plugins/rehype/shell-placeholder-transformer.js';
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LANG_ALIASES,
  DEFAULT_LANGS,
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEMES,
  SHIKI_TRANSFORMERS,
  shikiColorReplacements,
} from '../dist/plugins/rehype/shiki-constants.js';
import { serialize } from '../dist/server/index.js';

const long = 'const x = "' + 'a'.repeat(1200) + '";';

const blocks = [
  [
    'javascript',
    'const a = 1; // [!code highlight]\nfunction f(x) {\n  return `${x}`; // [!code focus]\n}\n',
  ],
  ['js', 'let x = 1; // [!code ++]\nlet y = 2; // [!code --]\n\n\nconsole.log(x, y)'],
  [
    'typescript',
    'type A<T> = { [K in keyof T]?: T[K] };\nexport const f = <T,>(a: T): A<T> => ({});',
  ],
  ['tsx', 'export const C = () => <div className="x">{/* hi */}</div>;\r\nconst y = 2;\r\n'],
  ['python', 'def f(x):\n\t"""doc\n\tstring"""\n\treturn x  # [!code highlight]\n'],
  ['bash', 'example --name <item_name> --region <region_id>\ncat <<EOF\nhello $USER\nEOF\n'],
  [
    'sh',
    'curl -X POST https://api.example.com/v1/<resource_id> \\\n  -H "Authorization: Bearer <token>"',
  ],
  ['json', '{\n  "a": [1, 2, {"b": null}],\n  "c": "\\u00e9"\n}'],
  ['yaml', 'a: 1\nb:\n  - "x"\n  - |\n    multi\n    line\n'],
  ['html', '<style>body { color: red; }</style>\n<script>let a = 1;</script>\n<div>héllo 🌍</div>'],
  ['markdown', '# Title\n\n```js\nconst a = 1;\n```\n\n- item **bold**'],
  ['mdx', 'import X from "y";\n\n<X prop={1}>text</X>\n'],
  ['php', '<?php\necho "hi $name";\n?>'],
  ['rust', 'fn main() {\n    let s = r#"raw "string""#;\n    println!("{}", s);\n}'],
  ['go', 'package main\n\nfunc main() {\n\tfmt.Println("世界")\n}'],
  ['diff', '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new'],
  ['c++', '#include <vector>\ntemplate <typename T> T f(T t) { return t; }'],
  ['blade', '<div>{{ $value }}</div>'],
  ['c', 'int main(void) { return 42; }'],
  ['css', '.value { color: red; display: grid; }'],
  ['c#', 'public record Value(int Id);'],
  ['dart', 'final values = <int>[1, 2];'],
  ['java', 'public class Value { public int id() { return 42; } }'],
  ['jsx', 'export const Value = () => <div>value</div>;'],
  ['kotlin', 'data class Value(val id: Int)'],
  ['log', '2026-01-01 00:00:00 INFO ready'],
  ['lua', 'local value = 42\nprint(value)'],
  ['powershell', 'Get-Process | Where-Object { $_.Id -gt 42 }'],
  ['ruby', 'items = [1, 2]\nitems.map { |item| item + 1 }'],
  ['solidity', 'pragma solidity ^0.8.0;\ncontract Value { uint public id = 42; }'],
  ['swift', 'struct Value { let id: Int }'],
  ['toml', '[value]\nid = 42'],
  ['markdown', '# Nested\n```ps1\nGet-Process | Select-Object Name\n```'],
  ['mdx', '# Nested\n```ts\ntype Value = { id: number };\n```'],
  ['haml', '%section\n  :markdown\n    # Nested\n    ```python\n    print("nested")\n    ```'],
  ['sql', "SELECT * FROM users WHERE name = 'x'; -- comment"],
  ['vue', '<template><div>{{ a }}</div></template>\n<script setup lang="ts">const a = 1</script>'],
  ['docker', 'FROM node:20\nRUN echo "hi"'],
  ['ansi', '\u001b[31mred\u001b[0m plain'],
  ['text', 'plain text\nwith lines'],
  ['not-a-language', 'falls back to text'],
  ['javascript', long + '\nconst short = 1;'],
  ['javascript', ''],
  ['python', '\n\n\n'],
  ['json', '{"\u0000": "\uFFFD\uD83D\uDE00"}'],
];

const configs = [
  {},
  { codeStyling: 'dark' },
  { theme: 'dracula' },
  { themes: { light: 'github-light', dark: 'github-dark' } },
  { themes: { light: 'css-variables', dark: 'dark-plus' } },
  { theme: 'css-variables' },
  { themes: { light: 'one-light', dark: 'one-dark-pro' } },
];

const reference = await createHighlighter({
  themes: structuredClone(DEFAULT_THEMES),
  langs: DEFAULT_LANGS,
});

function tree(lang, code, meta) {
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: [`language-${lang}`] },
            data: meta ? { meta } : undefined,
            children: [{ type: 'text', value: code }],
          },
        ],
      },
    ],
  };
}

async function expected(lang, code, meta, options) {
  lang = DEFAULT_LANG_ALIASES[lang] ?? 'text';
  if (!reference.getLoadedLanguages().includes(lang)) await reference.loadLanguage(lang);
  for (const theme of [options.theme, options.themes?.light, options.themes?.dark])
    if (theme && !reference.getLoadedThemes().includes(theme)) await reference.loadTheme(theme);
  const hast = reference.codeToHast(code, {
    lang,
    themes: {
      light:
        options.themes?.light ??
        options.theme ??
        (options.codeStyling === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME),
      dark: options.themes?.dark ?? options.theme ?? DEFAULT_DARK_THEME,
    },
    colorReplacements: shikiColorReplacements,
    tabindex: false,
    tokenizeMaxLineLength: 1000,
    tokenizeTimeLimit: 0,
    transformers:
      lang === 'shellscript'
        ? [...SHIKI_TRANSFORMERS, shellPlaceholderTransformer]
        : SHIKI_TRANSFORMERS,
  });
  const pre = hast.children[0];
  const data = meta ? { meta } : {};
  pre.data = data;
  pre.properties.language = lang;
  pre.children[0].data = data;
  pre.children[0].properties.language = lang;
  return pre;
}

async function check(order) {
  for (const options of order(configs))
    for (const [lang, code] of order(blocks))
      for (const meta of [undefined, 'title="a.js" {1,3}']) {
        const root = tree(lang, code, meta);
        await rehypeSyntaxHighlighting(options)(root);
        assert.deepStrictEqual(
          root.children[0],
          await expected(lang, code, meta, options),
          `${lang} ${JSON.stringify(options)} ${meta}`
        );
      }
}

test('first compilation highlights twoslash documentation in another default language', async () => {
  const source = [
    '```ts twoslash',
    '/**',
    ' * Helper docs.',
    ' * ```python',
    ' * print("nested documentation")',
    ' * ```',
    ' */',
    'function helper(value: number) { return value + 1; }',
    'helper',
    '// ^?',
    '```',
  ].join('\n');
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  let result;
  try {
    result = await serialize({
      source,
      syntaxHighlightingOptions: { linkMap: new Map([['helper', '#helper']]) },
    });
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
  assert.ok('compiledSource' in result);
  assert.match(result.compiledSource, /children: "print"/);
  assert.match(result.compiledSource, /PopupContent/);
  assert.match(result.compiledSource, /href: "#helper"/);
});

test('all default languages are ready before highlighting a mixed tree', async () => {
  const defaults = DEFAULT_LANGS.map((lang) => {
    const block = blocks.find(([name]) => name === lang);
    assert.ok(block, `missing default fixture: ${lang}`);
    return block;
  });
  const root = {
    type: 'root',
    children: defaults.map(([lang, code]) => tree(lang, code).children[0]),
  };
  await rehypeSyntaxHighlighting()(root);
  for (const [index, [lang, code]] of defaults.entries())
    assert.deepStrictEqual(root.children[index], await expected(lang, code, undefined, {}), lang);
});

test('single-pass highlighting matches shiki codeToHast', async () => {
  await check((items) => items);
  await check((items) => [...items].reverse());
});

test('several code blocks in one tree match shiki codeToHast', async () => {
  const options = { themes: { light: 'github-light', dark: 'github-dark' } };
  const root = {
    type: 'root',
    children: blocks.map(([lang, code]) => tree(lang, code).children[0]),
  };
  await rehypeSyntaxHighlighting(options)(root);
  for (const [index, [lang, code]] of blocks.entries())
    assert.deepStrictEqual(root.children[index], await expected(lang, code, undefined, options));
});

test('deeply nested code matches shiki codeToHast', async () => {
  const code = Array.from({ length: 6 }, () => '['.repeat(900)).join('\n');
  const root = tree('json', code);
  await rehypeSyntaxHighlighting()(root);
  assert.deepStrictEqual(root.children[0], await expected('json', code, undefined, {}));
});

test('deeply nested blocks highlight about as fast as shiki codeToHast', async () => {
  for (const [lang, open, sep] of [
    ['json', '[', ','],
    ['clojure', '(', ' '],
    ['typescript', '(', ','],
  ]) {
    const code = [
      ...Array.from({ length: 90 }, () => open.repeat(30)),
      ...Array.from({ length: 20 }, (_, i) => `${i}${sep}${`1${sep}`.repeat(440)}// [!code ++]`),
    ].join('\n');
    const meta = '{1,3}';
    await expected(lang, '1', undefined, {});
    await rehypeSyntaxHighlighting()(tree(lang, '1'));
    let start = performance.now();
    const want = await expected(lang, code, meta, {});
    const stock = performance.now() - start;
    const root = tree(lang, code, meta);
    start = performance.now();
    await rehypeSyntaxHighlighting()(root);
    const elapsed = performance.now() - start;
    assert.deepStrictEqual(root.children[0], want, lang);
    assert.ok(elapsed < 3 * stock + 250, `${lang}: ${elapsed} ms vs ${stock} ms`);
  }
});

test('the line cache stays bounded over many distinct lines', async () => {
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc');
  gc();
  const base = process.memoryUsage().heapUsed;
  let peak = 0;
  for (let page = 0; page < 80; page++) {
    const code = Array.from({ length: 10_000 }, (_, i) => `${page * 10_000 + i}`).join('\n');
    await rehypeSyntaxHighlighting()(tree('json', code));
    if (page % 10 === 9) {
      gc();
      peak = Math.max(peak, process.memoryUsage().heapUsed - base);
    }
  }
  assert.ok(peak < 64e6, `${peak / 1e6} MB`);
});

test('custom languages still highlight', async () => {
  const grammar = {
    name: 'pipeline',
    aliases: ['pipe'],
    scopeName: 'source.pipeline',
    embeddedLangs: ['javascript'],
    repository: {},
    patterns: [
      { match: '\\b(stage|run)\\b', name: 'keyword.control.pipeline' },
      { match: '"[^"]*"', name: 'string.quoted.double.pipeline' },
      { begin: '^<script>$', end: '^</script>$', patterns: [{ include: 'source.js' }] },
    ],
  };
  const code = 'stage "build"\nrun "make"\n<script>\nconst value = 42;\n</script>';
  const custom = await createHighlighter({
    themes: structuredClone(DEFAULT_THEMES),
    langs: [...DEFAULT_LANGS, grammar],
  });
  const want = custom.codeToHast(code, {
    lang: 'pipeline',
    themes: { light: DEFAULT_LIGHT_THEME, dark: DEFAULT_DARK_THEME },
    colorReplacements: shikiColorReplacements,
    tabindex: false,
    tokenizeMaxLineLength: 1000,
    tokenizeTimeLimit: 0,
    transformers: SHIKI_TRANSFORMERS,
  }).children[0];
  want.data = {};
  want.properties.language = 'pipeline';
  want.children[0].data = {};
  want.children[0].properties.language = 'pipeline';
  for (const lang of ['pipeline', 'pipe']) {
    const root = tree(lang, code);
    await rehypeSyntaxHighlighting({ customLanguages: [JSON.stringify(grammar)] })(root);
    want.properties.language = lang;
    want.children[0].properties.language = lang;
    assert.deepStrictEqual(root.children[0], want);
  }
});
