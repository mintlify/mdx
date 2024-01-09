import { MDXComponent, getCompiledMdx } from "@mintlify/mdx";
import type { MDXCompiledResult } from "@mintlify/mdx";
import type { GetStaticProps, InferGetStaticPropsType } from "next";

export const getStaticProps = (async () => {
  const fileContentResponse = await fetch(
    "https://raw.githubusercontent.com/mintlify/starter/main/essentials/code.mdx"
  );
  const fileContentData = await fileContentResponse.text();

  const mdxSource = await getCompiledMdx({
    source: fileContentData,
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
