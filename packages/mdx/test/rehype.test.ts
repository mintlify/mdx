import fs from 'node:fs/promises';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';

import { rehypeSyntaxHighlighting } from '../src/plugins/index.js';
import { MOCK_HAST_TREE } from './fixtures/mock-hast-tree.js';

describe('Unit test', () => {
  it('should set pre code node properties', async () => {
    // Plugin isolated run
    const processor = unified().use(rehypeSyntaxHighlighting);
    const result = await processor.run(structuredClone(MOCK_HAST_TREE));
    const preCodeNode = result.children.find(
      (node) => node.type === 'element' && node.tagName === 'pre'
    );

    // Check if pre code node properties are set
    expect(preCodeNode?.type === 'element' && preCodeNode.properties.class).toBeDefined();
    expect(preCodeNode?.type === 'element' && preCodeNode.properties.style).toBeDefined();
    expect(preCodeNode?.type === 'element' && preCodeNode.properties.language).toBeDefined();

    // Check if language is set correctly
    expect(preCodeNode?.type === 'element' && preCodeNode.properties.language).toBe('javascript');

    // Check if data meta is set correctly
    expect(preCodeNode?.type === 'element' && preCodeNode.data?.meta).toBe('index.js {1}');
  });
});

describe('Snapshot test', () => {
  const createProcessor = () =>
    unified().use(remarkParse).use(remarkRehype).use(rehypeSyntaxHighlighting).use(rehypeStringify);

  it('syntax highlight', async () => {
    const processor = createProcessor();
    const result = await processor.process(
      await fs.readFile(new URL('./fixtures/syntax-highlight.md', import.meta.url))
    );

    // Check syntax highlighting
    await expect(result.toString()).toMatchFileSnapshot('./fixtures/syntax-highlight.out.html');
  });

  it('twoslash', async () => {
    const processor = createProcessor();
    const result = await processor.process(
      await fs.readFile(new URL('./fixtures/twoslash.md', import.meta.url))
    );

    // Check twoslash
    await expect(result.toString()).toMatchFileSnapshot('./fixtures/twoslash.out.html');
  });

  it('link support', async () => {
    const processor = createProcessor();
    const result = await processor.process(
      await fs.readFile(new URL('./fixtures/link-support.md', import.meta.url))
    );

    // Check link support
    await expect(result.toString()).toMatchFileSnapshot('./fixtures/link-support.out.html');
  });
});
