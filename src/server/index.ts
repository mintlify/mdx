import { compileMDX } from "next-mdx-remote/rsc";
import type { CompileMDXResult, MDXRemoteProps } from "next-mdx-remote/rsc";
import { serialize } from "next-mdx-remote/serialize";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { rehypeSyntaxHighlighting } from "../plugins/index.js";
import type { SerializeOptions } from "../types/index.js";

export const getCompiledMdx = async ({
  source,
  mdxOptions,
  scope,
  parseFrontmatter = true,
}: {
  source: string;
  mdxOptions?: SerializeOptions["mdxOptions"];
  scope?: SerializeOptions["scope"];
  parseFrontmatter?: SerializeOptions["parseFrontmatter"];
}) => {
  try {
    const serializedResponse = await serialize(source, {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkSmartypants,
          remarkMath,
          ...(mdxOptions?.remarkPlugins || []),
        ],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypeSyntaxHighlighting,
            {
              ignoreMissing: true,
            },
          ],
          ...(mdxOptions?.rehypePlugins || []),
        ],
        format: mdxOptions?.format || "mdx",
        useDynamicImport: mdxOptions?.useDynamicImport || true,
      },
      scope,
      parseFrontmatter,
    });

    return serializedResponse;
  } catch (error) {
    console.error(`Error occurred while serializing MDX: ${error}`);

    throw error;
  }
};

export const getCompiledServerMdx = async <
  TFrontmatter = Record<string, unknown>,
>({
  source,
  mdxOptions,
  components,
  parseFrontmatter = true,
}: {
  source: MDXRemoteProps["source"];
  mdxOptions?: SerializeOptions["mdxOptions"];
  components?: MDXRemoteProps["components"];
  parseFrontmatter?: SerializeOptions["parseFrontmatter"];
}): Promise<CompileMDXResult<TFrontmatter>> => {
  return await compileMDX({
    source,
    options: {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkSmartypants,
          remarkMath,
          ...(mdxOptions?.remarkPlugins || []),
        ],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypeSyntaxHighlighting,
            {
              ignoreMissing: true,
            },
          ],
          ...(mdxOptions?.rehypePlugins || []),
        ],
        format: mdxOptions?.format || "mdx",
        useDynamicImport: mdxOptions?.useDynamicImport || true,
      },
      parseFrontmatter,
    },
    components,
  });
};
