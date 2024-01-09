import { getCompiledServerMdx } from "@mintlify/mdx";

export default async function Home() {
  const fileContentResponse = await fetch(
    "https://raw.githubusercontent.com/mintlify/starter/main/essentials/code.mdx"
  );
  const fileContentData = await fileContentResponse.text();

  const { content, frontmatter } = await getCompiledServerMdx({
    source: fileContentData,
  });

  return (
    <article className="prose mx-auto py-8">
      <h1>{String(frontmatter.title)}</h1>

      {content}
    </article>
  );
}
