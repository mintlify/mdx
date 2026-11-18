import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createTwoslasher } from 'twoslash';
import ts from 'typescript';

import { getTwoslashOptions } from '../dist/plugins/rehype/twoslash/config.js';
import { createSandboxedTypeScript } from '../dist/plugins/rehype/twoslash/sandbox.js';

const secret = 'twoslash-sandbox-secret';
const secretDir = mkdtempSync(join(tmpdir(), 'twoslash-sandbox-'));
const secretJson = join(secretDir, 'manifest.json');
const secretTs = join(secretDir, 'secret.ts');
writeFileSync(secretJson, JSON.stringify({ previewModeSigningKey: secret }));
writeFileSync(secretTs, `export const key = '${secret}';`);

const emitImport = (file) => `// @module: amd
// @moduleResolution: node10
// @outFile: out.js
// @showEmit
// @showEmittedFile: out.js
// @resolveJsonModule
// @noErrors
import x from '${file}';
console.log(x);`;

const { twoslasher } = getTwoslashOptions();

test('control: unsandboxed twoslash emits server-local files', () => {
  const unsafe = createTwoslasher({
    compilerOptions: { moduleResolution: ts.ModuleResolutionKind.Bundler },
  });
  assert.match(unsafe(emitImport(secretJson), 'ts').code, new RegExp(secret));
});

test('sandboxed compiler cannot read server-local files', () => {
  const sandboxed = createTwoslasher({
    tsModule: createSandboxedTypeScript(ts),
    compilerOptions: { moduleResolution: ts.ModuleResolutionKind.Bundler },
  });
  for (const file of [secretJson, secretTs, `${secretDir}/node_modules/../manifest.json`]) {
    assert.doesNotMatch(sandboxed(emitImport(file), 'ts').code, new RegExp(secret));
  }
});

test('path-redirecting inline flags are rejected', () => {
  assert.throws(() => twoslasher(emitImport(secretJson), 'ts'), /@outFile, @showEmittedFile/);
  assert.throws(() => twoslasher(`// @paths: {"*": ["/etc/*"]}\nconst a = 1;`, 'ts'), /@paths/);
});

test('type declarations from node_modules still resolve', () => {
  const result = twoslasher(
    `import { readFileSync } from 'node:fs';\nimport { createHighlighter } from 'shiki';\nconst h = createHighlighter;\n//    ^?\nreadFileSync;`,
    'ts'
  );
  assert.match(result.queries[0].text, /CreateHighlighterFactory/);
});

test('virtual files and showEmit still work', () => {
  const result = twoslasher(
    `// @filename: a.ts\nexport const a = 1;\n// @filename: b.ts\nimport { a } from './a';\nconst b = a;\n//    ^?`,
    'ts'
  );
  assert.equal(result.queries[0].text, 'const b: 1');
  assert.match(
    twoslasher(`// @showEmit\nconst x: number = 1;\nexport {}`, 'ts').code,
    /const x = 1;/
  );
});
