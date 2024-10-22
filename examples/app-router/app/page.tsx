import { getCompiledServerMdx } from '@mintlify/mdx';
import { promises as fs } from 'fs';

export default async function Home() {
  const data = await fs.readFile(process.cwd() + '/examples/highlight-example.mdx');

  const { content, frontmatter } = await getCompiledServerMdx<{
    title: string;
  }>({
    source: data.toString(),
  });

  return (
    <article className="prose mx-auto py-8">
      <h1>{frontmatter.title}</h1>
      {content}
    </article>
  );
}
