import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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
const outsidePackage = join(secretDir, 'node_modules', 'outside');
mkdirSync(outsidePackage, { recursive: true });
writeFileSync(join(outsidePackage, 'index.d.ts'), `export declare const key: '${secret}';`);
writeFileSync(join(outsidePackage, 'package.json'), JSON.stringify({ name: secret }));
const symlinkedPackage = mkdtempSync(
  join(fileURLToPath(new URL('../node_modules/', import.meta.url)), '.twoslash-sandbox-')
);
symlinkSync(secretJson, join(symlinkedPackage, 'package.json'));
symlinkSync(secretTs, join(symlinkedPackage, 'index.d.ts'));
test.after(() => {
  rmSync(symlinkedPackage, { recursive: true, force: true });
  rmSync(secretDir, { recursive: true, force: true });
});

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
  for (const file of [
    secretJson,
    secretTs,
    `${secretDir}/node_modules/../manifest.json`,
    join(outsidePackage, 'package.json'),
    join(outsidePackage, 'index.d.ts'),
    join(symlinkedPackage, 'package.json'),
    join(symlinkedPackage, 'index.d.ts'),
  ]) {
    assert.doesNotMatch(sandboxed(emitImport(file), 'ts').code, new RegExp(secret));
  }
});

test('only allowlisted inline flags are accepted', () => {
  assert.throws(() => twoslasher(emitImport(secretJson), 'ts'), /@outFile, @showEmittedFile/);
  assert.throws(() => twoslasher(`// @paths: {"*": ["/etc/*"]}\nconst a = 1;`, 'ts'), /@paths/);
  assert.throws(
    () => twoslasher(`// @declarationDir: /tmp\nconst a = 1;`, 'ts'),
    /@declarationDir/
  );
  const result = twoslasher(
    `// @strict: false\n// @target: es2015\n// @errors: 2322\nconst a: number = 'a';`,
    'ts'
  );
  assert.equal(result.errors[0].code, 2322);
});

test('virtual files do not leak between runs after a failure', () => {
  assert.throws(() =>
    twoslasher(
      `// @filename: leaked.ts\nexport const k = '${secret}';\n// @filename: index.ts\nconst x: number = 'a';`,
      'ts'
    )
  );
  const result = twoslasher(
    `// @noErrors\nimport { k } from './leaked';\nconst v = k;\n//    ^?`,
    'ts'
  );
  assert.doesNotMatch(result.queries[0].text, new RegExp(secret));
});

test('sandboxed system cannot modify the file system', () => {
  const { sys } = createSandboxedTypeScript(ts);
  assert.throws(() => sys.writeFile(join(secretDir, 'x'), ''));
  assert.throws(() => sys.createDirectory(join(secretDir, 'x')));
  assert.throws(() => sys.deleteFile?.(secretJson));
  assert.throws(() => sys.setModifiedTime?.(secretJson, new Date()));
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
