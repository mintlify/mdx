import assert from 'node:assert/strict';
import test from 'node:test';

import { rehypeSyntaxHighlighting } from '../dist/plugins/index.js';

function styleAt(line, characterIndex) {
  let offset = 0;
  for (const span of line.children) {
    const content = span.children.map((child) => child.value).join('');
    if (characterIndex < offset + content.length) return span.properties.style;
    offset += content.length;
  }
  throw new Error(`No token at character ${characterIndex}`);
}

test('shell placeholders keep the same token style through their final character', async () => {
  const code = 'example --name <item_name> --region <region_id>';

  for (const language of ['bash', 'sh', 'shellscript']) {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: { className: [`language-${language}`] },
              children: [{ type: 'text', value: code }],
            },
          ],
        },
      ],
    };

    await rehypeSyntaxHighlighting()(tree);

    const line = tree.children[0].children[0].children[0];
    assert.equal(
      line.children.map((span) => span.children.map((child) => child.value).join('')).join(''),
      code
    );

    for (const placeholder of ['item_name', 'region_id']) {
      const lastCharacter = code.indexOf(placeholder) + placeholder.length - 1;
      assert.equal(styleAt(line, lastCharacter), styleAt(line, lastCharacter - 1));
      assert.notEqual(styleAt(line, lastCharacter), styleAt(line, lastCharacter + 1));
    }
  }
});
