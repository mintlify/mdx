import type { Root } from 'hast';

const MOCK_HAST_TREE: Root = {
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
          properties: { className: ['language-js'] },
          children: [
            {
              type: 'text',
              value: "console.log('Hello World!');",
            },
          ],
          data: { meta: 'index.js {1}' },
        },
      ],
    },
  ],
};

export { MOCK_HAST_TREE };
