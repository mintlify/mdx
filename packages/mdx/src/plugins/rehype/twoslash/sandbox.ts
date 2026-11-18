import * as path from 'node:path';
import {
  findFlagNotations,
  TwoslashError,
  type TwoslashInstance,
  type TwoslashOptions,
} from 'twoslash';
import type ts from 'typescript';

type TypeScriptModule = NonNullable<TwoslashOptions['tsModule']>;

const DECLARATION_FILE = /\.d\.[cm]?ts$/;

const BLOCKED_FLAGS = new Set(
  [
    'baseUrl',
    'declarationDir',
    'mapRoot',
    'out',
    'outDir',
    'outFile',
    'paths',
    'plugins',
    'rootDir',
    'rootDirs',
    'showEmittedFile',
    'sourceRoot',
    'tsBuildInfoFile',
    'typeRoots',
  ].map((flag) => flag.toLowerCase())
);

function isWithin(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isInNodeModules(target: string): boolean {
  return target.split(path.sep).includes('node_modules');
}

/**
 * Wraps a TypeScript module so the compiler can only read the bundled lib
 * files and type declarations from node_modules. Author code is untrusted and
 * must never be able to resolve or emit other files on the server.
 */
export function createSandboxedTypeScript(tsModule: typeof ts): TypeScriptModule {
  const nodeSys = tsModule.sys;
  const libDirectory = path.dirname(tsModule.getDefaultLibFilePath({}));

  const canReadFile = (fileName: string) => {
    const resolved = path.resolve(fileName);
    if (isWithin(libDirectory, resolved)) return true;
    if (!isInNodeModules(resolved)) return false;
    return DECLARATION_FILE.test(resolved) || path.basename(resolved) === 'package.json';
  };

  const canReadDirectory = (directory: string) => {
    const resolved = path.resolve(directory);
    return isWithin(libDirectory, resolved) || isInNodeModules(resolved);
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
    realpath: nodeSys.realpath
      ? (target) => {
          const real = nodeSys.realpath?.(target) ?? target;
          return canReadFile(real) || canReadDirectory(real) ? real : target;
        }
      : undefined,
    writeFile: () => {
      throw new Error('Writing files is not allowed in twoslash');
    },
  };

  return { ...tsModule, sys, default: tsModule };
}

/**
 * Rejects inline `// @flag` notations that redirect module resolution or emit
 * output to arbitrary paths.
 */
export function withBlockedFlags(
  twoslasher: TwoslashInstance,
  tsModule: TypeScriptModule
): TwoslashInstance {
  const optionDeclarations = (
    tsModule as TypeScriptModule & { optionDeclarations: Parameters<typeof findFlagNotations>[2] }
  ).optionDeclarations;
  const run = ((code, extension, options) => {
    const blocked = findFlagNotations(code, options?.customTags ?? [], optionDeclarations)
      .map((flag) => flag.name)
      .filter((name) => BLOCKED_FLAGS.has(name.toLowerCase()));
    if (blocked.length) {
      throw new TwoslashError(
        'Disallowed inline compiler flags',
        `The following flags are not supported: ${blocked.map((name) => `@${name}`).join(', ')}`,
        'Remove these flags from the code block.'
      );
    }
    return twoslasher(code, extension, options);
  }) as TwoslashInstance;
  run.getCacheMap = twoslasher.getCacheMap;
  return run;
}
