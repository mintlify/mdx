import type { MDXCompiledResult } from "@mintlify/mdx";
import { MDXComponent, getCompiledMdx } from "@mintlify/mdx";
import { promises as fs } from "fs";
import type { GetStaticProps, InferGetStaticPropsType } from "next";

export const getStaticProps = (async () => {
  const data = await fs.readFile(
    process.cwd() + "/examples/highlight-example.mdx",
  );

  const mdxSource = await getCompiledMdx({
    source: data.toString(),
  });

  return {
    props: {
      mdxSource,
    },
  };
}) satisfies GetStaticProps<{
  mdxSource: MDXCompiledResult;
}>;

export default function Home({
  mdxSource,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <article className="prose mx-auto py-8">
      <h1>{String(mdxSource.frontmatter.title)}</h1>

      <MDXComponent {...mdxSource} />
    </article>
  );
}
