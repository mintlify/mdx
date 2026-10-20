import type { Highlighter, ShikiInternal } from 'shiki';
import { EncodedTokenMetadata } from 'shiki/textmate';

type Style = { fontStyle: number; foregroundId: number; backgroundId: number };
type ScopeNode = {
  parent: ScopeNode | null;
  scopeName: string;
  children: Map<string, ScopeNode>;
  metadata: number[];
};
type Scopes = { generation: number; children: Map<string, ScopeNode>; defaults: number[] };
type Scan = { starts: number[]; nodes: (ScopeNode | null)[]; ruleStack: unknown };
type ScopePath = { parent: ScopePath | null; scopeName: string };
type State = {
  parent: State | null;
  ruleId: number;
  beginRuleCapturedEOL: boolean;
  endRule: string | null;
  nameScopesList: { scopePath: ScopePath } | null;
  contentNameScopesList: { scopePath: ScopePath } | null;
};
type Grammar = {
  name: string;
  themeProvider: { themeMatch(path: ScopeNode): Style | null; getDefaults(): Style };
  balancedBracketSelectors: {
    matchesAlways: boolean;
    matchesNever: boolean;
    match(scopes: string[]): boolean;
  } | null;
  _rootScopeName: string;
  _tokenTypeMatchers: unknown[];
  _basicScopeAttributesProvider: {
    getDefaultAttributes(): { languageId: number; tokenType: number };
  };
  getMetadataForScope(scope: string): { languageId: number; tokenType: number };
  tokenizeLine(
    line: string,
    state: unknown,
    limit: number
  ): { tokens: { startIndex: number; scopes: string[] }[]; ruleStack: unknown };
};

const CACHE_LIMIT = 32_000_000;
const MAX_SCOPES = 32;

export const tooDeep = new Error('scope stack too deep for single-pass highlighting');
const deep: Scan = { starts: [], nodes: [], ruleStack: null };

const detach = (value: string): string => (' ' + value).slice(1);

let currentTheme = 0;
let generation = 0;
let cacheSize = 0;
const themeIndexes = new Map<unknown, number>();
let nextId = 0;
let interned = new Map<string, number>();
let scans = new Map<string, Scan>();
let ids = new WeakMap<object, number>();
const grammarScopes = new WeakMap<Grammar, Scopes>();
const wrappedGrammars = new WeakMap<Grammar, object>();

function scopesOf(grammar: Grammar): Scopes {
  if (cacheSize > CACHE_LIMIT) {
    generation++;
    cacheSize = 0;
    scans = new Map();
    interned = new Map();
    ids = new WeakMap();
  }
  let scopes = grammarScopes.get(grammar);
  if (scopes?.generation !== generation) {
    scopes = { generation, children: new Map(), defaults: [] };
    grammarScopes.set(grammar, scopes);
  }
  return scopes;
}

function scopeNode(scopes: Scopes, names: string[]): ScopeNode | null {
  let node: ScopeNode | null = null;
  let children = scopes.children;
  for (const name of names) {
    let child = children.get(name);
    if (!child) {
      const scopeName = detach(name);
      child = { parent: node, scopeName, children: new Map(), metadata: [] };
      children.set(scopeName, child);
      cacheSize += 400 + 2 * scopeName.length;
    }
    node = child;
    children = child.children;
  }
  return node;
}

function defaultMetadata(grammar: Grammar, scopes: Scopes): number {
  let value = scopes.defaults[currentTheme];
  if (value === undefined) {
    const basic = grammar._basicScopeAttributesProvider.getDefaultAttributes();
    const style = grammar.themeProvider.getDefaults();
    value = EncodedTokenMetadata.set(
      0,
      basic.languageId,
      basic.tokenType,
      null,
      style.fontStyle,
      style.foregroundId,
      style.backgroundId
    );
    scopes.defaults[currentTheme] = value;
  }
  return value;
}

function scopeMetadata(grammar: Grammar, scopes: Scopes, node: ScopeNode): number {
  const pending: ScopeNode[] = [];
  let current: ScopeNode | null = node;
  while (current && current.metadata[currentTheme] === undefined) {
    pending.push(current);
    current = current.parent;
  }
  let value = current
    ? (current.metadata[currentTheme] as number)
    : defaultMetadata(grammar, scopes);
  for (let index = pending.length - 1; index >= 0; index--) {
    const item = pending[index] as ScopeNode;
    const basic = grammar.getMetadataForScope(item.scopeName);
    const style = grammar.themeProvider.themeMatch(item);
    value = EncodedTokenMetadata.set(
      value,
      basic.languageId,
      basic.tokenType,
      null,
      style ? style.fontStyle : -1,
      style ? style.foregroundId : 0,
      style ? style.backgroundId : 0
    );
    item.metadata[currentTheme] = value;
  }
  return value;
}

function scopeNames(node: ScopeNode | null): string[] {
  const names: string[] = [];
  for (let current = node; current; current = current.parent) names.push(current.scopeName);
  return names.reverse();
}

function chainId<T extends { parent: T | null }>(node: T | null, label: (node: T) => string) {
  const pending: T[] = [];
  let current = node;
  while (current && !ids.has(current)) {
    pending.push(current);
    current = current.parent;
  }
  cacheSize += 200 * pending.length;
  let id: number | '' = current ? (ids.get(current) as number) : '';
  for (let index = pending.length - 1; index >= 0; index--) {
    const item = pending[index] as T;
    const key = `${id}${label(item)}`;
    let next = interned.get(key);
    if (next === undefined) {
      interned.set(detach(key), (next = nextId++));
      cacheSize += 100 + 2 * key.length;
    }
    ids.set(item, next);
    id = next;
  }
  return id;
}

const pathId = (path: ScopePath | null | undefined) =>
  chainId(path ?? null, (item) => ` ${item.scopeName}`);

const stateId = (state: State) =>
  chainId(
    state,
    (item) =>
      `|${item.ruleId}|${item.beginRuleCapturedEOL ? 1 : 0}|${pathId(
        item.nameScopesList?.scopePath
      )}|${pathId(item.contentNameScopesList?.scopePath)}|${JSON.stringify(item.endRule)}`
  );

function grammarId(grammar: Grammar): number {
  let id = ids.get(grammar);
  if (id === undefined) ids.set(grammar, (id = nextId++));
  return id;
}

function scanLine(grammar: Grammar, scopes: Scopes, line: string, state: State, limit: number) {
  const key = `${grammarId(grammar)}:${stateId(state)}:${line}`;
  let scan = scans.get(key);
  if (!scan) {
    const result =
      (line.match(/[([{<>]/g)?.length ?? 0) > MAX_SCOPES
        ? null
        : grammar.tokenizeLine(line, state, limit);
    if (!result || result.tokens.some((token) => token.scopes.length > MAX_SCOPES)) {
      scan = deep;
    } else {
      scan = {
        starts: result.tokens.map((token) => token.startIndex),
        nodes: result.tokens.map((token) => scopeNode(scopes, token.scopes)),
        ruleStack: result.ruleStack,
      };
      stateId(result.ruleStack as State);
    }
    cacheSize += 200 + 2 * key.length + 16 * scan.starts.length;
    scans.set(detach(key), scan);
  }
  if (scan === deep) throw tooDeep;
  return scan;
}

function tokenizeLine2(grammar: Grammar, line: string, state: State, limit: number) {
  const scopes = scopesOf(grammar);
  const scan = scanLine(grammar, scopes, line, state, limit);
  const brackets = grammar.balancedBracketSelectors;
  const always = brackets?.matchesAlways ?? false;
  const selective = !!brackets && !always && !brackets.matchesNever;
  const tokens: number[] = [];
  for (let index = 0; index < scan.nodes.length; index++) {
    const node = scan.nodes[index] as ScopeNode | null;
    let metadata = node ? scopeMetadata(grammar, scopes, node) : 0;
    if (always || (selective && brackets.match(scopeNames(node))))
      metadata = EncodedTokenMetadata.set(metadata, 0, 8, true, -1, 0, 0);
    if (tokens[tokens.length - 1] === metadata) continue;
    tokens.push(scan.starts[index] as number, metadata);
  }
  return { tokens, ruleStack: scan.ruleStack, stoppedEarly: false };
}

function wrapGrammar(grammar: Grammar): object {
  if (grammar._tokenTypeMatchers.length > 0 || !grammar._rootScopeName) return grammar;
  let wrapped = wrappedGrammars.get(grammar);
  if (!wrapped) {
    wrapped = {
      name: grammar.name,
      tokenizeLine2: (line: string, state: State, limit: number) =>
        tokenizeLine2(grammar, line, state, limit),
    };
    wrappedGrammars.set(grammar, wrapped);
  }
  return wrapped;
}

export function singlePassInternal(highlighter: Highlighter): ShikiInternal {
  const internal = highlighter.getInternalContext();
  return {
    ...internal,
    getLanguage: (name) => wrapGrammar(internal.getLanguage(name) as never) as never,
    setTheme: (name) => {
      const result = internal.setTheme(name);
      let index = themeIndexes.get(name);
      if (index === undefined) {
        index = themeIndexes.size;
        themeIndexes.set(typeof name === 'string' ? detach(name) : name, index);
      }
      currentTheme = index;
      return result;
    },
  };
}
