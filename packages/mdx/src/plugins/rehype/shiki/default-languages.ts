import type { LanguageRegistration } from 'shiki';
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
import shellscript from 'shiki/langs/shellscript.mjs';
import solidity from 'shiki/langs/solidity.mjs';
import swift from 'shiki/langs/swift.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import yaml from 'shiki/langs/yaml.mjs';

import { DEFAULT_LANGS } from '../shiki-constants.js';

const registrations: ReadonlyMap<string, LanguageRegistration[]> = new Map([
  ['bash', shellscript],
  ['blade', blade],
  ['c', c],
  ['css', css],
  ['c#', csharp],
  ['c++', cpp],
  ['dart', dart],
  ['diff', diff],
  ['go', go],
  ['html', html],
  ['java', java],
  ['javascript', javascript],
  ['jsx', jsx],
  ['json', json],
  ['kotlin', kotlin],
  ['log', log],
  ['lua', lua],
  ['markdown', markdown],
  ['mdx', mdx],
  ['php', php],
  ['powershell', powershell],
  ['python', python],
  ['ruby', ruby],
  ['rust', rust],
  ['solidity', solidity],
  ['swift', swift],
  ['toml', toml],
  ['typescript', typescript],
  ['tsx', tsx],
  ['yaml', yaml],
]);

export default DEFAULT_LANGS.flatMap((lang) => {
  const registration = registrations.get(lang);
  if (!registration) throw new Error(`Missing default language registration: ${lang}`);
  return registration;
});
