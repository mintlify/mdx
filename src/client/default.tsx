import type { MDXRemoteProps } from 'next-mdx-remote';
import { MDXRemote } from 'next-mdx-remote';

export const MDXComponent = ({
  compiledSource,
  components,
  scope,
  frontmatter,
  lazy,
}: MDXRemoteProps) => {
  return (
    <MDXRemote
      compiledSource={compiledSource}
      components={components}
      scope={scope}
      lazy={lazy}
      frontmatter={frontmatter}
    />
  );
};
