import { realpathSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultHandbookOptions,
  findFlagNotations,
  TwoslashError,
  type TwoslashInstance,
  type TwoslashOptions,
} from 'twoslash';
import type ts from 'typescript';

type TypeScriptModule = NonNullable<TwoslashOptions['tsModule']>;

const DECLARATION_FILE = /\.d\.[cm]?ts$/;
const REALPATH_CACHE_LIMIT = 10_000;

const ALLOWED_HANDBOOK_FLAGS = new Set(
  Object.keys(defaultHandbookOptions)
    .filter((flag) => flag !== 'showEmittedFile')
    .map((flag) => flag.toLowerCase())
);

const ALLOWED_COMPILER_FLAGS = new Set(
  [
    'allowImportingTsExtensions',
    'allowJs',
    'allowSyntheticDefaultImports',
    'allowUmdGlobalAccess',
    'allowUnreachableCode',
    'allowUnusedLabels',
    'alwaysStrict',
    'checkJs',
    'declaration',
    'downlevelIteration',
    'emitDecoratorMetadata',
    'erasableSyntaxOnly',
    'esModuleInterop',
    'exactOptionalPropertyTypes',
    'experimentalDecorators',
    'importHelpers',
    'isolatedModules',
    'jsx',
    'jsxFactory',
    'jsxFragmentFactory',
    'jsxImportSource',
    'lib',
    'module',
    'moduleDetection',
    'moduleResolution',
    'noFallthroughCasesInSwitch',
    'noImplicitAny',
    'noImplicitOverride',
    'noImplicitReturns',
    'noImplicitThis',
    'noPropertyAccessFromIndexSignature',
    'noUncheckedIndexedAccess',
    'noUncheckedSideEffectImports',
    'noUnusedLocals',
    'noUnusedParameters',
    'preserveConstEnums',
    'removeComments',
    'skipLibCheck',
    'strict',
    'strictBindCallApply',
    'strictBuiltinIteratorReturn',
    'strictFunctionTypes',
    'strictNullChecks',
    'strictPropertyInitialization',
    'stripInternal',
    'target',
    'types',
    'useDefineForClassFields',
    'useUnknownInCatchVariables',
    'verbatimModuleSyntax',
  ].map((flag) => flag.toLowerCase())
);

function isWithin(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function tryRealpath(target: string): string | undefined {
  try {
    return realpathSync(target);
  } catch {
    return undefined;
  }
}

/** The node_modules folders Node would search from each anchor directory. */
function getNodeModulesRoots(anchors: string[]): string[] {
  const roots = new Set<string>();
  for (const anchor of anchors) {
    let dir = path.resolve(anchor);
    while (true) {
      if (path.basename(dir) !== 'node_modules') {
        const root = path.join(dir, 'node_modules');
        roots.add(root);
        const real = tryRealpath(root);
        if (real) roots.add(real);
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return [...roots];
}

/**
 * Wraps a TypeScript module so the compiler can only read the bundled lib
 * files and type declarations from the app's own node_modules. Author code is
 * untrusted and must never be able to resolve or emit other files on the
 * server.
 */
export function createSandboxedTypeScript(tsModule: typeof ts): TypeScriptModule {
  const nodeSys = tsModule.sys;
  const libDirectory = path.dirname(tsModule.getDefaultLibFilePath({}));
  const libDirectories = [libDirectory, tryRealpath(libDirectory)].filter(
    (dir): dir is string => !!dir
  );
  const nodeModulesRoots = getNodeModulesRoots([
    process.cwd(),
    libDirectory,
    path.dirname(fileURLToPath(import.meta.url)),
  ]);

  const isInLib = (target: string) => libDirectories.some((dir) => isWithin(dir, target));
  const isInNodeModules = (target: string) =>
    nodeModulesRoots.some((root) => isWithin(root, target));

  const isAllowedFile = (target: string) =>
    isInLib(target) ||
    (isInNodeModules(target) &&
      (DECLARATION_FILE.test(target) || path.basename(target) === 'package.json'));

  const isAllowedDirectory = (target: string) => isInLib(target) || isInNodeModules(target);

  const realpaths = new Map<string, string | undefined>();
  const cachedRealpath = (target: string) => {
    if (realpaths.has(target)) return realpaths.get(target);
    if (realpaths.size >= REALPATH_CACHE_LIMIT) realpaths.clear();
    const real = tryRealpath(target);
    realpaths.set(target, real);
    return real;
  };

  const isAllowed = (target: string, check: (target: string) => boolean) => {
    const resolved = path.resolve(target);
    if (!check(resolved)) return false;
    const real = cachedRealpath(resolved);
    return real !== undefined && check(real);
  };

  const canReadFile = (fileName: string) => isAllowed(fileName, isAllowedFile);
  const canReadDirectory = (directory: string) => isAllowed(directory, isAllowedDirectory);

  const denyWrite = () => {
    throw new Error('Writing files is not allowed in twoslash');
  };

  const sys: ts.System = {
    ...nodeSys,
    fileExists: (fileName) => canReadFile(fileName) && nodeSys.fileExists(fileName),
    readFile: (fileName, encoding) =>
      canReadFile(fileName) ? nodeSys.readFile(fileName, encoding) : undefined,
    directoryExists: (directory) =>
      canReadDirectory(directory) && nodeSys.directoryExists(directory),
    getDirectories: (directory) =>
      canReadDirectory(directory) ? nodeSys.getDirectories(directory) : [],
    readDirectory: (directory, ...rest) =>
      canReadDirectory(directory)
        ? nodeSys.readDirectory(directory, ...rest).filter(canReadFile)
        : [],
    realpath: (target) => {
      const real = cachedRealpath(path.resolve(target));
      return real && (isAllowedFile(real) || isAllowedDirectory(real)) ? real : target;
    },
    writeFile: denyWrite,
    createDirectory: denyWrite,
    deleteFile: denyWrite,
    setModifiedTime: denyWrite,
    watchFile: undefined,
    watchDirectory: undefined,
  };

  return { ...tsModule, sys, default: tsModule };
}

/**
 * Twoslash only clears `// @filename:` files after a successful run, so a
 * sample that throws would leave its files visible to the next caller.
 */
function clearVirtualFiles(twoslasher: TwoslashInstance) {
  for (const env of twoslasher.getCacheMap()?.values() ?? []) {
    const program = env.languageService.getProgram();
    for (const fileName of program?.getRootFileNames() ?? []) {
      if (program?.getSourceFile(fileName)?.text) env.createFile(fileName, '');
    }
  }
}

/**
 * Only accepts inline `// @flag` notations from an allowlist, so flags that
 * redirect module resolution or emit output cannot be used, and isolates
 * runs from each other.
 */
export function restrictTwoslasher(
  twoslasher: TwoslashInstance,
  tsModule: TypeScriptModule
): TwoslashInstance {
  const optionDeclarations = (
    tsModule as TypeScriptModule & { optionDeclarations: Parameters<typeof findFlagNotations>[2] }
  ).optionDeclarations;
  const run = ((code, extension, options) => {
    const blocked = findFlagNotations(code, options?.customTags ?? [], optionDeclarations)
      .filter(
        (flag) =>
          (flag.type === 'handbookOptions' &&
            !ALLOWED_HANDBOOK_FLAGS.has(flag.name.toLowerCase())) ||
          (flag.type === 'compilerOptions' && !ALLOWED_COMPILER_FLAGS.has(flag.name.toLowerCase()))
      )
      .map((flag) => flag.name);
    if (blocked.length) {
      throw new TwoslashError(
        'Disallowed inline compiler flags',
        `The following flags are not supported: ${blocked.map((name) => `@${name}`).join(', ')}`,
        'Remove these flags from the code block.'
      );
    }
    try {
      return twoslasher(code, extension, options);
    } catch (error) {
      clearVirtualFiles(twoslasher);
      throw error;
    }
  }) as TwoslashInstance;
  run.getCacheMap = twoslasher.getCacheMap;
  return run;
}
