import assert from 'node:assert/strict';
import test from 'node:test';

import { serialize } from '../dist/server/index.js';

// A tiny TextMate grammar where `foo` is a keyword.
const grammar = (name, extra = {}) =>
  JSON.stringify({
    name,
    scopeName: `source.${name.toLowerCase()}`,
    repository: {},
    patterns: [{ match: '\\bfoo\\b', name: 'keyword.control' }],
    ...extra,
  });

async function highlight(customLanguages, fence) {
  const result = await serialize({
    source: '```' + fence + '\nfoo bar\n```\n',
    syntaxHighlightingOptions: { customLanguages },
  });
  assert.ok(!('error' in result), String(result.error));
  return result.compiledSource;
}

test('custom languages match code fences case-insensitively', async (t) => {
  const cases = [
    ['a mixed-case grammar name', [grammar('MyLang')], 'MyLang', 'MyLang'],
    ['a lowercase fence for a mixed-case name', [grammar('MyLang')], 'mylang', 'MyLang'],
    ['a mixed-case alias', [grammar('mylang', { aliases: ['ML'] })], 'ML', 'mylang'],
    ['a lowercase alias', [grammar('mylang', { aliases: ['ml'] })], 'ml', 'mylang'],
  ];
  for (const [name, langs, fence, expected] of cases) {
    await t.test(name, async () => {
      const code = await highlight(langs, fence);
      assert.match(code, new RegExp(`language: "${expected}"`));
      assert.match(code, /children: "foo"/, '`foo` should be its own highlighted token');
    });
  }
});
