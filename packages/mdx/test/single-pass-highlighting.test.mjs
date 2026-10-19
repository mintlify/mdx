import assert from 'node:assert/strict';
import test from 'node:test';
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

test('custom languages still highlight', async () => {
  const grammar = {
    name: 'pipeline',
    scopeName: 'source.pipeline',
    repository: {},
    patterns: [
      { match: '\\b(stage|run)\\b', name: 'keyword.control.pipeline' },
      { match: '"[^"]*"', name: 'string.quoted.double.pipeline' },
    ],
  };
  const code = 'stage "build"\nrun "make"';
  const root = tree('pipeline', code);
  await rehypeSyntaxHighlighting({ customLanguages: [JSON.stringify(grammar)] })(root);
  const custom = await createHighlighter({
    themes: structuredClone(DEFAULT_THEMES),
    langs: [grammar],
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
  assert.deepStrictEqual(root.children[0], want);
});
