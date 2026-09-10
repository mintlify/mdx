import type { Element, ElementContent, Root } from 'hast';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { rehypeSyntaxHighlighting } from '../rehypeSyntaxHighlighting.js';

function codeBlock(lang: string, code: string, meta?: string): Element {
  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: [`language-${lang}`] },
        ...(meta && { data: { meta } }),
        children: [{ type: 'text', value: code }],
      },
    ],
  };
}

async function highlight(blocks: Element[], options = {}): Promise<Element[]> {
  const tree: Root = { type: 'root', children: blocks };
  const out = await unified().use(rehypeSyntaxHighlighting, options).run(tree);
  return out.children.filter((node): node is Element => node.type === 'element');
}

function tagNames(node: ElementContent, acc: string[] = []): string[] {
  if (node.type === 'element') {
    acc.push(node.tagName);
    node.children.forEach((child) => tagNames(child, acc));
  }
  return acc;
}

function styles(node: ElementContent, acc: string[] = []): string[] {
  if (node.type === 'element') {
    if (typeof node.properties.style === 'string') acc.push(node.properties.style);
    node.children.forEach((child) => styles(child, acc));
  }
  return acc;
}

const TS = 'const answer: number = 42;\nconsole.log(answer);';

describe('rehypeSyntaxHighlighting', () => {
  it('highlights a default language into token spans', async () => {
    const [pre] = await highlight([codeBlock('bash', 'npm install shiki')]);
    expect(pre?.properties.language).toBe('shellscript');
    expect(tagNames(pre!)).toContain('span');
    expect(styles(pre!).length).toBeGreaterThan(0);
  });

  it('loads a non-default grammar on first use', async () => {
    const [pre] = await highlight([codeBlock('rust', 'fn main() { println!("hi"); }')]);
    expect(pre?.properties.language).toBe('rust');
    expect(styles(pre!).length).toBeGreaterThan(1);
  });

  it('falls back to plain text for an unknown language', async () => {
    const [pre] = await highlight([codeBlock('notalanguage', 'x = 1')]);
    expect(pre?.properties.language).toBe('text');
    expect(tagNames(pre!)).toContain('code');
  });

  it('only runs twoslash on blocks carrying the twoslash flag', async () => {
    const [plain, flagged] = await highlight([
      codeBlock('ts', TS),
      codeBlock('ts', `${TS}\n//         ^?`, 'twoslash'),
    ]);
    expect(tagNames(plain!)).not.toContain('Popup');
    expect(tagNames(flagged!)).toContain('Popup');
    expect(flagged?.data?.meta).toBeUndefined();
  });

  it('keeps the twoslash flag out of the highlight cache', async () => {
    const [flagged] = await highlight([codeBlock('ts', TS, 'twoslash')]);
    const [plain] = await highlight([codeBlock('ts', TS)]);
    expect(tagNames(flagged!)).toContain('Popup');
    expect(tagNames(plain!)).not.toContain('Popup');
  });

  it('returns equal but independent trees for repeated blocks', async () => {
    const [first, second] = await highlight([
      codeBlock('py', 'print(1)'),
      codeBlock('py', 'print(1)'),
    ]);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);

    const firstSpan = first!.children[0];
    if (firstSpan?.type !== 'element') throw new Error('expected code element');
    firstSpan.properties.className = ['mutated'];
    firstSpan.children.push({ type: 'text', value: 'mutated' });
    const secondSpan = second!.children[0];
    if (secondSpan?.type !== 'element') throw new Error('expected code element');
    expect(secondSpan.properties.className).not.toEqual(['mutated']);
    expect(secondSpan.children.at(-1)).not.toEqual({ type: 'text', value: 'mutated' });
  });

  it('keys the cache by theme', async () => {
    const code = 'SELECT 1;';
    const [light] = await highlight([codeBlock('sql', code)], { theme: 'github-light' });
    const [dark] = await highlight([codeBlock('sql', code)], { theme: 'github-dark' });
    expect(styles(light!)).not.toEqual(styles(dark!));
  });

  it('gives a cache hit the same output as the miss that filled it', async () => {
    const block = () => codeBlock('json', '{ "a": [1, 2, 3], "b": null }');
    const [miss] = await highlight([block()]);
    const [hit] = await highlight([block()]);
    expect(hit).toEqual(miss);
  });
});
