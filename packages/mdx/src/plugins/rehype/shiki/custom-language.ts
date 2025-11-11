import { scope } from 'arktype';

const types = scope({
  ScopeName: 'string',
  ScopePath: 'string',
  ScopePattern: 'string',
  IncludeString: 'string',
  RegExpString: 'string | RegExp',

  ILocation: {
    filename: 'string',
    line: 'number',
    char: 'number',
  },

  ILocatable: {
    '$vscodeTextmateLocation?': 'ILocation',
  },

  IRawCapturesMap: {
    '[string]': 'IRawRule',
  },

  IRawRepositoryMap: {
    '[string]': 'IRawRule',
  },

  IRawCaptures: 'IRawCapturesMap & ILocatable',

  _IRawRule: {
    'include?': 'IncludeString',
    'name?': 'ScopeName',
    'contentName?': 'ScopeName',
    'match?': 'RegExpString',
    'captures?': 'IRawCaptures',
    'begin?': 'RegExpString',
    'beginCaptures?': 'IRawCaptures',
    'end?': 'RegExpString',
    'endCaptures?': 'IRawCaptures',
    'while?': 'RegExpString',
    'whileCaptures?': 'IRawCaptures',
    'patterns?': 'IRawRule[]',
    'repository?': 'IRawRepository',
    'applyEndPatternLast?': 'boolean',
    '[string]': 'unknown',
  },

  IRawRule: '_IRawRule & ILocatable',

  IRawRepository: 'IRawRepositoryMap & ILocatable',

  _IRawGrammar: {
    repository: 'IRawRepository',
    scopeName: 'ScopeName',
    patterns: 'IRawRule[]',
    'injections?': {
      '[string]': 'IRawRule',
    },
    'injectionSelector?': 'string',
    'fileTypes?': 'string[]',
    'name?': 'string',
    'firstLineMatch?': 'string',
    '[string]': 'unknown',
  },

  IRawGrammar: 'ILocatable & _IRawGrammar',

  LanguageRegistration: {
    name: 'string',
    scopeName: 'string',
    'displayName?': 'string',
    'aliases?': 'string[]',
    'embeddedLangs?': 'string[]',
    'embeddedLangsLazy?': 'string[]',
    'balancedBracketSelectors?': 'string[]',
    'unbalancedBracketSelectors?': 'string[]',
    'foldingStopMarker?': 'string',
    'foldingStartMarker?': 'string',
    'injectTo?': 'string[]',
    '[string]': 'unknown',
  },

  TextMateGrammar: 'LanguageRegistration & IRawGrammar',
}).export();

export const TextMateGrammar = types.TextMateGrammar;
export type TextMateGrammarType = typeof TextMateGrammar.infer;
