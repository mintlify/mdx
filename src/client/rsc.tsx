import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import { MDXRemote } from 'next-mdx-remote/rsc';

export const MDXServerComponent = ({ source, components }: MDXRemoteProps) => {
  return <MDXRemote source={source} components={components} />;
};
