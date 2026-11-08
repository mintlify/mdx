import {
  transformerNotationHighlight,
  transformerNotationFocus,
  transformerMetaHighlight,
  transformerNotationDiff,
} from '@shikijs/transformers';
import type { ShikiTransformer } from '@shikijs/types';
import { createCssVariablesTheme } from 'shiki/core';
import type { ThemeRegistration } from 'shiki/types';

export { DEFAULT_LANG_ALIASES, UNIQUE_LANGS, type ShikiLang } from './shiki-languages.js';

export const LINE_HIGHLIGHT_CLASS_NAME = 'line-highlight';
export const LINE_FOCUS_CLASS_NAME = 'line-focus';
export const LINE_DIFF_ADD_CLASS_NAME = 'line-diff line-add';
export const LINE_DIFF_REMOVE_CLASS_NAME = 'line-diff line-remove';

export type ShikiTheme = (typeof SHIKI_THEMES)[number];

export const SHIKI_CSS_THEME = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--mint-',
  variableDefaults: {
    'color-text': '#171717',
    'color-background': 'transparent',
    'token-constant': '#171717',
    'token-string': '#297a3a',
    'token-comment': '#666666',
    'token-keyword': '#bd2864',
    'token-parameter': '#a35200',
    'token-function': '#0068d6',
    'token-string-expression': '#297a3a',
    'token-punctuation': '#171717',
    'token-link': '#297a3a',

    'ansi-black': '#000000',
    'ansi-black-dim': '#00000080',
    'ansi-red': '#bb0000',
    'ansi-red-dim': '#bb000080',
    'ansi-green': '#00bb00',
    'ansi-green-dim': '#00bb0080',
    'ansi-yellow': '#bbbb00',
    'ansi-yellow-dim': '#bbbb0080',
    'ansi-blue': '#0000bb',
    'ansi-blue-dim': '#0000bb80',
    'ansi-magenta': '#ff00ff',
    'ansi-magenta-dim': '#ff00ff80',
    'ansi-cyan': '#00bbbb',
    'ansi-cyan-dim': '#00bbbb80',
    'ansi-white': '#eeeeee',
    'ansi-white-dim': '#eeeeee80',
    'ansi-bright-black': '#555555',
    'ansi-bright-black-dim': '#55555580',
    'ansi-bright-red': '#ff5555',
    'ansi-bright-red-dim': '#ff555580',
    'ansi-bright-green': '#00ff00',
    'ansi-bright-green-dim': '#00ff0080',
    'ansi-bright-yellow': '#ffff55',
    'ansi-bright-yellow-dim': '#ffff5580',
    'ansi-bright-blue': '#5555ff',
    'ansi-bright-blue-dim': '#5555ff80',
    'ansi-bright-magenta': '#ff55ff',
    'ansi-bright-magenta-dim': '#ff55ff80',
    'ansi-bright-cyan': '#55ffff',
    'ansi-bright-cyan-dim': '#55ffff80',
    'ansi-bright-white': '#ffffff',
    'ansi-bright-white-dim': '#ffffff80',
  },
  fontStyle: true,
});

export const DEFAULT_LANG = 'text' as const;
export const DEFAULT_DARK_THEME: ShikiTheme = 'dark-plus' as const;
export const DEFAULT_LIGHT_THEME: ShikiTheme = 'github-light-default' as const;
export const DEFAULT_THEMES: [ShikiTheme, ShikiTheme, ThemeRegistration] = [
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  SHIKI_CSS_THEME,
] as const;

export const shikiColorReplacements: Partial<Record<ShikiTheme, string | Record<string, string>>> =
  {
    'dark-plus': {
      '#1e1e1e': '#0B0C0E',
    },
  };

export const SHIKI_THEMES = [
  'andromeeda',
  'aurora-x',
  'ayu-dark',
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'dark-plus',
  'dracula',
  'dracula-soft',
  'everforest-dark',
  'everforest-light',
  'github-dark',
  'github-dark-default',
  'github-dark-dimmed',
  'github-dark-high-contrast',
  'github-light',
  'github-light-default',
  'github-light-high-contrast',
  'gruvbox-dark-hard',
  'gruvbox-dark-medium',
  'gruvbox-dark-soft',
  'gruvbox-light-hard',
  'gruvbox-light-medium',
  'gruvbox-light-soft',
  'houston',
  'kanagawa-dragon',
  'kanagawa-lotus',
  'kanagawa-wave',
  'laserwave',
  'light-plus',
  'material-theme',
  'material-theme-darker',
  'material-theme-lighter',
  'material-theme-ocean',
  'material-theme-palenight',
  'min-dark',
  'min-light',
  'monokai',
  'night-owl',
  'nord',
  'one-dark-pro',
  'one-light',
  'plastic',
  'poimandres',
  'red',
  'rose-pine',
  'rose-pine-dawn',
  'rose-pine-moon',
  'slack-dark',
  'slack-ochin',
  'snazzy-light',
  'solarized-dark',
  'solarized-light',
  'synthwave-84',
  'tokyo-night',
  'vesper',
  'vitesse-black',
  'vitesse-dark',
  'vitesse-light',

  'css-variables', // for users who want to use custom CSS to style their code blocks
] as const;

export const DEFAULT_LANGS = [
  'bash',
  'blade',
  'c',
  'css',
  'c#',
  'c++',
  'dart',
  'diff',
  'go',
  'html',
  'java',
  'javascript',
  'jsx',
  'json',
  'kotlin',
  'log',
  'lua',
  'markdown',
  'mdx',
  'php',
  'powershell',
  'python',
  'ruby',
  'rust',
  'solidity',
  'swift',
  'toml',
  'typescript',
  'tsx',
  'yaml',
];

export const matchAlgorithm = {
  matchAlgorithm: 'v3',
} as const;

export const SHIKI_TRANSFORMERS: ShikiTransformer[] = [
  transformerMetaHighlight({
    className: LINE_HIGHLIGHT_CLASS_NAME,
  }),
  transformerNotationHighlight({
    ...matchAlgorithm,
    classActiveLine: LINE_HIGHLIGHT_CLASS_NAME,
  }),
  transformerNotationFocus({
    ...matchAlgorithm,
    classActiveLine: LINE_FOCUS_CLASS_NAME,
  }),
  transformerNotationDiff({
    ...matchAlgorithm,
    classLineAdd: LINE_DIFF_ADD_CLASS_NAME,
    classLineRemove: LINE_DIFF_REMOVE_CLASS_NAME,
  }),
];
