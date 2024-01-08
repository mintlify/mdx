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

1. Call the `getCompiledMdx` function inside `getStaticProps` and return the `mdxSource` object.

   ```tsx
   export const getStaticProps = (async () => {
     const mdxSource = await getCompiledMdx({
       source: "## Markdown H2",
     });

     return {
       props: {
         mdxSource,
       },
     };
   }) satisfies GetStaticProps<{
     mdxSource: MDXCompiledResult;
   }>;
   ```

2. Pass the `mdxSource` object as props inside the `MDXComponent`.
   ```tsx
   export default function Page({
     mdxSource,
   }: InferGetStaticPropsType<typeof getStaticProps>) {
     return <MDXComponent {...mdxSource} />;
   }
   ```

<details>
  <summary>Full example</summary>

```tsx
import { getCompiledMdx, MDXComponent } from "@mintlify/mdx";
import type { InferGetStaticPropsType, GetStaticProps } from "next";
import type { MDXCompiledResult } from "@mintlify/mdx";
import React from "react";

export const getStaticProps = (async () => {
  const mdxSource = await getCompiledMdx({
    source: "## Markdown H2",
  });

  return {
    props: {
      mdxSource,
    },
  };
}) satisfies GetStaticProps<{
  mdxSource: MDXCompiledResult;
}>;

export default function Page({
  mdxSource,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return <MDXComponent {...mdxSource} />;
}
```

</details>

## APIs

Similar to [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote), this package exports the following APIs:

- `getCompiledMdx` - a function that compiles MDX source to MDXCompiledResult
- `MDXComponent` - a component that renders MDXCompiledResult

### getCompiledMdx

```tsx
import { getCompiledMdx } from "@mintlify/mdx";

const mdxSource = await getCompiledMdx({
  source: "## Markdown H2",
  scope: {
    // scope
  },
  components: {
    // components
  },
  remarkPlugins: [
    // remark plugins
  ],
  rehypePlugins: [
    // rehype plugins
  ],
});
```

### MDXComponent

```tsx
import { MDXComponent } from "@mintlify/mdx";

<MDXComponent
  components={
    {
      // components
    }
  }
  {...mdxSource}
/>;
```
