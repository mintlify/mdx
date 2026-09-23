import { MDXRemote } from '@mintlify/mdx/rsc';
import { promises as fs } from 'fs';

export default async function Home() {
  const data = await fs.readFile(process.cwd() + '/examples/highlight-example.mdx', 'utf8');

  return (
    <article className="prose dark:prose-invert mx-auto py-8">
      <MDXRemote source={data} parseFrontmatter />
    </article>
  );
}
