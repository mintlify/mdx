## Getting Started

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) and it uses the [App Router](https://nextjs.org/docs/app). It also uses [Tailwind CSS](https://tailwindcss.com/) for styling.

You can check out the code at [https://github.com/mintlify/mdx/blob/main/examples/app-router/app/page.tsx](https://github.com/mintlify/mdx/blob/main/examples/app-router/app/page.tsx) to understand how to parse your markdown using [@mintlify/mdx](https://www.npmjs.com/package/@mintlify/mdx).

## Demo

You can check out the demo of [this page](https://github.com/mintlify/mdx/blob/main/examples/app-router/app/page.tsx) at [https://mdx-app-router.vercel.app](https://mdx-app-router.vercel.app).

## How to use

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
