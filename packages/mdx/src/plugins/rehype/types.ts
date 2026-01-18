import { BundledLanguage } from 'shiki/types';

import { SHIKI_THEMES } from './constants.js';

type ShikiLang = BundledLanguage | 'ansi' | 'text';

type ShikiTheme = (typeof SHIKI_THEMES)[number];

interface RehypeSyntaxHighlightingOptions {
  theme?: ShikiTheme;
  themes?: Record<'light' | 'dark', ShikiTheme>;
  codeStyling?: 'dark' | 'system' | 'light' | Record<string, unknown> | null;
  linkMap?: Map<string, string>;
  customLanguages?: string[];
}

export type { ShikiLang, ShikiTheme, RehypeSyntaxHighlightingOptions };
