<div align="center">
  <a href="https://mintlify.com">
    <img
      src="https://res.cloudinary.com/mintlify/image/upload/v1665385627/logo-rounded_zuk7q1.svg"
      alt="Mintlify Logo"
      height="64"
    />
  </a>
  <br />
  <p>
    <h3>
      <b>
        Mint
      </b>
    </h3>
  </p>
  <p>
    <b>
      Open source docs builder that's beautiful, fast, and easy to work with.
    </b>
  </p>
  <p>

![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?logo=github) [![Tweet](https://img.shields.io/twitter/url?url=https%3A%2F%2Fmintlify.com%2F)](https://twitter.com/intent/tweet?url=&text=Check%20out%20%40mintlify)

  </p>
</div>

# Mintlify's markdown parser

**@mintlify/mdx** is a thin layer on top of [next-mdx-remote-client](https://github.com/ipikuka/next-mdx-remote-client) that provides a better developer experience for Next.js users by adding support for syntax highlighting.

## Installation

```bash
# using npm
npm i @mintlify/mdx

# using yarn
yarn add @mintlify/mdx

# using pnpm
pnpm add @mintlify/mdx
```

## Examples

### Next.js pages router

[You can check the example app here](https://github.com/mintlify/mdx/tree/main/examples/pages-router).

1. Call the `serialize` function inside `getStaticProps` and return the `mdxSource` object.

   ```tsx
   export const getStaticProps = (async () => {
     const mdxSource = await serialize({
       source: '## Markdown H2',
     });

     if ('error' in mdxSource) {
       // handle error case
     }

     return { props: { mdxSource } };
   }) satisfies GetStaticProps<{
     mdxSource: SerializeSuccess;
   }>;
   ```

2. Pass the `mdxSource` object as props inside the `MDXComponent`.

   ```tsx
   export default function Page({ mdxSource }: InferGetStaticPropsType<typeof getStaticProps>) {
     return <MDXClient {...mdxSource} />;
   }
   ```

### Next.js app router

[You can check the example app here](https://github.com/mintlify/mdx/tree/main/examples/app-router).

1. Use the `MDXRemote` component directly inside your async React Server Component.

   ```tsx
   import { MDXRemote } from '@mintlify/mdx';

   export default async function Home() {
     const source: `---
      title: Title
      ---

      ## Markdown H2
      `;

     return (
       <article className="prose mx-auto py-8">
         <MDXRemote source={source} parseFrontmatter />
       </article>
     );
   }
   ```

## APIs

Similar to [next-mdx-remote-client](https://github.com/ipikuka/next-mdx-remote-client), this package exports the following APIs:

- `serialize` - a function that compiles MDX source to SerializeResult.
- `MDXClient` - a component that renders SerializeSuccess on the client.
- `MDXRemote` - a component that both serializes and renders the source - should be used inside async React Server Component.

### serialize

```tsx
import { serialize } from '@mintlify/mdx';

const mdxSource = await serialize({
  source: '## Markdown H2',
  mdxOptions: {
    remarkPlugins: [
      // Remark plugins
    ],
    rehypePlugins: [
      // Rehype plugins
    ],
  },
});
```

### MDXClient

```tsx
'use client';

import { MDXClient } from '@mintlify/mdx';

<MDXClient
  components={
    {
      // Your custom components
    }
  }
  {...mdxSource}
/>;
```

### MDXRemote

```tsx
import { MDXRemote } from '@mintlify/mdx';

<MDXRemote
  source="## Markdown H2"
  mdxOptions={{
    remarkPlugins: [
      // Remark plugins
    ],
    rehypePlugins: [
      // Rehype plugins
    ],
  }}
  components={
    {
      // Your custom components
    }
  }
/>;
```

<div align="center">
  <p>
    <sub>
      Built with ❤︎ by
      <a href="https://mintlify.com">
        Mintlify
      </a>
    </sub>
  </p>
</div>
