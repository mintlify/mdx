## Getting Started

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) and it uses the [Pages Router](https://nextjs.org/docs/pages). It also uses [Tailwind CSS](https://tailwindcss.com/) for styling.

You can check out the code at [https://github.com/mintlify/mdx/blob/main/examples/pages-router/pages/index.tsx](https://github.com/mintlify/mdx/blob/main/examples/pages-router/pages/index.tsx) to understand how to parse your markdown using [@mintlify/mdx](https://www.npmjs.com/package/@mintlify/mdx).

## Demo

You can check out the demo of [this page](https://github.com/mintlify/mdx/blob/main/examples/pages-router/pages/index.tsx) at [https://mdx-pages-router.vercel.app](https://mdx-pages-router.vercel.app).

## How to use

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
