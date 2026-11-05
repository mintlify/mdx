import bash from 'shiki/langs/bash.mjs';
import blade from 'shiki/langs/blade.mjs';
import c from 'shiki/langs/c.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import csharp from 'shiki/langs/csharp.mjs';
import css from 'shiki/langs/css.mjs';
import dart from 'shiki/langs/dart.mjs';
import diff from 'shiki/langs/diff.mjs';
import go from 'shiki/langs/go.mjs';
import html from 'shiki/langs/html.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import kotlin from 'shiki/langs/kotlin.mjs';
import log from 'shiki/langs/log.mjs';
import lua from 'shiki/langs/lua.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import mdx from 'shiki/langs/mdx.mjs';
import php from 'shiki/langs/php.mjs';
import powershell from 'shiki/langs/powershell.mjs';
import python from 'shiki/langs/python.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import rust from 'shiki/langs/rust.mjs';
import solidity from 'shiki/langs/solidity.mjs';
import swift from 'shiki/langs/swift.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import yaml from 'shiki/langs/yaml.mjs';

// Keep registration order identical to DEFAULT_LANGS, including each leaf's dependencies.
export const defaultLanguages = [
  ...bash,
  ...blade,
  ...c,
  ...css,
  ...csharp,
  ...cpp,
  ...dart,
  ...diff,
  ...go,
  ...html,
  ...java,
  ...javascript,
  ...jsx,
  ...json,
  ...kotlin,
  ...log,
  ...lua,
  ...markdown,
  ...mdx,
  ...php,
  ...powershell,
  ...python,
  ...ruby,
  ...rust,
  ...solidity,
  ...swift,
  ...toml,
  ...typescript,
  ...tsx,
  ...yaml,
];
