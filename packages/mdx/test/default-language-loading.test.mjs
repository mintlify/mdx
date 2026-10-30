import assert from 'node:assert/strict';
import test from 'node:test';
import { bundledLanguages, bundledLanguagesInfo, createHighlighter } from 'shiki';

import { DEFAULT_LANGS, DEFAULT_THEMES } from '../dist/plugins/rehype/shiki-constants.js';

const canonicalOrder = [
  'shellscript',
  'javascript',
  'css',
  'html',
  'html-derivative',
  'java',
  'xml',
  'sql',
  'json',
  'blade',
  'c',
  'csharp',
  'regexp',
  'glsl',
  'cpp-macro',
  'cpp',
  'dart',
  'diff',
  'go',
  'jsx',
  'kotlin',
  'log',
  'lua',
  'markdown',
  'mdx',
  'php',
  'powershell',
  'python',
  'haml',
  'typescript',
  'tsx',
  'graphql',
  'yaml',
  'ruby',
  'rust',
  'solidity',
  'swift',
  'toml',
];

test('the default aggregate preserves stock registration identity, dependencies and order', async () => {
  const stockInputs = (
    await Promise.all(
      DEFAULT_LANGS.map(async (language) => (await bundledLanguages[language]()).default)
    )
  ).flat();
  const { defaultLanguages } = await import('../dist/plugins/rehype/shiki/default-languages.js');
  assert.equal(DEFAULT_LANGS.length, 30);
  assert.equal(defaultLanguages.length, stockInputs.length);
  for (const [index, language] of stockInputs.entries())
    assert.equal(defaultLanguages[index], language, `registration ${index}: ${language.name}`);
  assert.deepEqual(
    [...new Set(defaultLanguages)].map((language) => language.name),
    canonicalOrder
  );
});

test('aggregated initialization preserves aliases, later loads, custom grammars and disposal', async () => {
  const stock = await createHighlighter({ themes: DEFAULT_THEMES, langs: DEFAULT_LANGS });
  const aggregate = await createHighlighter({
    themes: DEFAULT_THEMES,
    langs: [
      () =>
        import('../dist/plugins/rehype/shiki/default-languages.js').then(
          (module) => module.defaultLanguages
        ),
    ],
  });
  try {
    assert.deepEqual(aggregate.getLoadedLanguages(), stock.getLoadedLanguages());
    assert.deepEqual(aggregate.getLoadedThemes(), stock.getLoadedThemes());
    const names = new Set(canonicalOrder);
    const aliases = bundledLanguagesInfo
      .filter((language) => names.has(language.id))
      .flatMap((language) => [language.id, ...(language.aliases ?? [])]);
    for (const language of new Set([...DEFAULT_LANGS, ...aliases])) {
      const options = {
        lang: language,
        themes: { light: 'github-light-default', dark: 'dark-plus' },
      };
      const code = 'const value = "hello";\n// comment\n';
      assert.deepEqual(
        aggregate.codeToHast(code, options),
        stock.codeToHast(code, options),
        language
      );
    }
    const grammar = {
      name: 'aggregate-custom',
      aliases: ['aggregate-alias'],
      scopeName: 'source.aggregate-custom',
      embeddedLangs: ['typescript'],
      repository: {},
      patterns: [{ include: 'source.ts' }],
    };
    for (const highlighter of [stock, aggregate]) {
      await highlighter.loadLanguage('vue');
      await highlighter.loadTheme('dracula');
      await highlighter.loadLanguage(grammar);
    }
    assert.deepEqual(aggregate.getLoadedLanguages(), stock.getLoadedLanguages());
    assert.deepEqual(aggregate.getLoadedThemes(), stock.getLoadedThemes());
    for (const [language, code] of [
      ['vue', '<template><div>{{ value }}</div></template>'],
      ['aggregate-alias', 'const value: number = 1'],
      ['markdown', '# Title\n\n```typescript\nconst value: number = 1\n```'],
      ['mdx', 'import X from "x";\n\n<X value={1} />'],
    ]) {
      const options = { lang: language, theme: 'dracula' };
      for (let repeat = 0; repeat < 3; repeat++)
        assert.deepEqual(
          aggregate.codeToHast(code, options),
          stock.codeToHast(code, options),
          language
        );
    }
  } finally {
    stock.dispose();
    aggregate.dispose();
  }
  assert.throws(() => aggregate.getLoadedLanguages(), /disposed/);
  assert.throws(() => stock.getLoadedLanguages(), /disposed/);
});
