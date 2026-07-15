import type { TwoslashTypesCache } from '@shikijs/twoslash';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';

export type FileSystemTypesCacheOptions = {
  dir?: string;
  cwd?: string;
  salt?: string;
};

export function createFileSystemTypesCache(
  options: FileSystemTypesCacheOptions = {}
): TwoslashTypesCache {
  const { cwd = process.cwd(), salt = '' } = options;
  const candidateDirs = options.dir
    ? [options.dir]
    : [path.join(cwd, '.next/cache/twoslash'), path.join(os.tmpdir(), 'mintlify-twoslash-cache')];
  let dir: string | null = null;

  const filePathFor = (code: string, lang: string | undefined, cacheDir: string) => {
    const hash = createHash('SHA256')
      .update(`${salt}:${lang ?? ''}:${code}`)
      .digest('hex')
      .slice(0, 16);
    return path.join(cacheDir, `${hash}.json`);
  };

  return {
    init() {
      for (const candidate of candidateDirs) {
        try {
          fs.mkdirSync(candidate, { recursive: true });
          fs.accessSync(candidate, fs.constants.W_OK);
          dir = candidate;
          return;
        } catch {
          dir = null;
        }
      }
    },
    read(code, lang) {
      if (!dir) return null;
      try {
        return JSON.parse(fs.readFileSync(filePathFor(code, lang, dir), 'utf-8'));
      } catch {
        return null;
      }
    },
    write(code, data, lang) {
      if (!dir) return;
      try {
        fs.writeFileSync(filePathFor(code, lang, dir), JSON.stringify(data), 'utf-8');
      } catch {}
    },
  };
}
