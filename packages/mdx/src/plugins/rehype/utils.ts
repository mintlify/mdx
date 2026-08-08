import { type } from 'arktype';
import type { Element } from 'hast';

import { DEFAULT_THEMES } from './constants.js';
import { TextMateGrammar, TextMateGrammarType } from './shiki/custom-language.js';
import type { RehypeSyntaxHighlightingOptions, ShikiLang, ShikiTheme } from './types.js';

const LANGUAGE_PREFIX = 'language-';

function getElementClassNameList(element: Element): string[] {
  const classNameList = element.properties.className;

  const isArray = Array.isArray(classNameList);
  const isStringArray = isArray && classNameList.every((item) => typeof item === 'string');

  if (!isStringArray) return [];

  return classNameList;
}

/** Get language from element's classname without `language-` prefix */
function getLanguage(node: Element, aliases: Record<string, ShikiLang>): ShikiLang | undefined {
  const classNameList = getElementClassNameList(node);
  const languageClassName = classNameList.find((className) =>
    className.startsWith(LANGUAGE_PREFIX)
  );

  if (!languageClassName) return undefined;

  const language = languageClassName.slice(LANGUAGE_PREFIX.length);

  return aliases[language];
}

function getThemesToLoad(options: RehypeSyntaxHighlightingOptions) {
  const themesToLoad: ShikiTheme[] = [];
  const themesToExclude = [...DEFAULT_THEMES, 'css-variables'];

  if (options.themes) {
    themesToLoad.push(options.themes.dark);
    themesToLoad.push(options.themes.light);
  } else if (options.theme) {
    themesToLoad.push(options.theme);
  }

  const filteredThemesToLoad = themesToLoad.filter(
    (theme) => !themesToExclude.includes(theme)
  ) as Exclude<ShikiTheme, 'css-variables'>[];

  return filteredThemesToLoad;
}

function getParsedLanguages(languages: string[]) {
  const parsedLanguages: TextMateGrammarType[] = [];

  languages.forEach((language) => {
    const parsedLang = JSON.parse(language);
    const lang = TextMateGrammar(parsedLang);

    if (lang instanceof type.errors) {
      console.error(lang.summary);
      return;
    }

    parsedLanguages.push(lang);
  });

  return parsedLanguages;
}

function getLanguagesToLoad(options: RehypeSyntaxHighlightingOptions) {
  if (options.customLanguages) {
    const parsedLanguages = getParsedLanguages(options.customLanguages);
    return parsedLanguages;
  }

  return [];
}

function getCustomLanguagesNames(options: RehypeSyntaxHighlightingOptions) {
  const customLanguageNames: string[] = [];

  if (options.customLanguages) {
    const parsedLanguages = getParsedLanguages(options.customLanguages);

    parsedLanguages.forEach((lang) => {
      const possibleNames = [lang.name, lang.displayName, ...(lang.aliases ?? [])].filter(
        (l) => l != undefined
      );

      customLanguageNames.push(...possibleNames);
    });
  }

  return customLanguageNames;
}

export { getLanguage, getThemesToLoad, getLanguagesToLoad, getCustomLanguagesNames };
