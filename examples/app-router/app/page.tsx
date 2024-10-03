import { getCompiledServerMdx } from "@mintlify/mdx";

export default async function Home() {
  const fileContentResponse = await fetch(
    "https://gist.githubusercontent.com/deep93333/eb0c54f5b7496c6d17875b0ec4a55edd/raw/bca51b41e940393d50fafc78f14506130fe60b2c/code.mdx"
  );
  const fileContentData = await fileContentResponse.text();

  const { content, frontmatter } = await getCompiledServerMdx<{
    title: string;
  }>({
    source: fileContentData,
  });

  return (
    <article className="prose mx-auto py-8">
      <h1>{frontmatter.title}</h1>
      {content}
    </article>
  );
}
