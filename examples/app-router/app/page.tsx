import { MDXServerComponent } from "@mintlify/mdx";

export default async function Home() {
  const fileContentResponse = await fetch(
    "https://raw.githubusercontent.com/mintlify/starter/main/essentials/code.mdx"
  );
  const fileContentData = await fileContentResponse.text();

  // const { content, frontmatter } = await getCompiledServerMDX<{
  //   title: string;
  //   description: string;
  // }>({
  //   source: fileContentData,
  //   options: { parseFrontmatter: true },
  // });

  // console.log({ content, frontmatter });

  return (
    <>
      <article className="prose mx-auto py-8">
        <MDXServerComponent source={fileContentData} />
      </article>

      {/* <article className="prose mx-auto py-8">{content}</article> */}
    </>
  );
}
