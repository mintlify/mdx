import assert from 'node:assert/strict';
import test from 'node:test';

import { serialize } from '../dist/server/index.js';

const captureWarnings = async (fn) => {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    return { result: await fn(), warnings };
  } finally {
    console.warn = original;
  }
};

const source = '# Pricing\n\nPay $5 and get 10% off, then $3 more.\n\n$$\nx^2\n$$\n';

test('katex strict warnings include file path, line, and math snippet', async () => {
  const { result, warnings } = await captureWarnings(() =>
    serialize({ source, path: 'pricing.mdx', parseFrontmatter: false })
  );

  assert.ok('compiledSource' in result);
  assert.deepEqual(warnings, [
    'pricing.mdx:3:5: LaTeX-incompatible input in math "5 and get 10% off, then": % comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $) [commentAtEnd]',
  ]);
});

test('katex strict warnings fall back to line only without a path', async () => {
  const { warnings } = await captureWarnings(() => serialize({ source, parseFrontmatter: false }));

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^3:5: LaTeX-incompatible input/);
});

test('katex output is unchanged for inline, display, and fenced math', async () => {
  const { result, warnings } = await captureWarnings(() =>
    serialize({
      source: 'Inline $a+b$ here.\n\n$$\n\\frac{1}{2}\n$$\n\n```math\nc^2\n```\n',
      parseFrontmatter: false,
    })
  );

  assert.deepEqual(warnings, []);
  assert.equal(result.compiledSource.match(/className: "katex"/g)?.length, 3);
  assert.ok(!result.compiledSource.includes('language-math'));
});
