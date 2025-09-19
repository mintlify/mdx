import { MDXClient } from '@mintlify/mdx/client';
import { serialize } from '@mintlify/mdx/server';
import type { SerializeResult } from '@mintlify/mdx/types';
import { promises as fs } from 'fs';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';

export const getStaticProps = (async () => {
  const data = await fs.readFile(process.cwd() + '/examples/highlight-example.mdx', 'utf8');

  const mdxSource = await serialize({ source: data });
  if ('error' in mdxSource) {
    throw mdxSource.error;
  }

  return { props: { mdxSource } };
}) satisfies GetStaticProps<{
  mdxSource: Omit<SerializeResult, 'error'>;
}>;

export default function Home({ mdxSource }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <article className="prose mx-auto py-8">
      <h1>{String(mdxSource.frontmatter.title)}</h1>

      <MDXClient {...mdxSource} />
    </article>
  );
}
