import { getCompiledServerMdx } from '@mintlify/mdx';
import { promises as fs } from 'fs';

export default async function Home() {
  const data = await fs.readFile(process.cwd() + '/examples/highlight.mdx');

  const { content, frontmatter } = await getCompiledServerMdx<{
    title: string;
    description: string;
  }>({
    source: data.toString(),
  });

  return (
    <article className="prose mx-auto py-12">
      <h1>{frontmatter.title}</h1>
      <h2>{frontmatter.title}</h2>
      {content}
    </article>
  );
}
