import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import { MDXRemote } from 'next-mdx-remote/rsc';

export const MDXServerComponent = ({ source, components }: MDXRemoteProps) => {
  // @ts-ignore: 'MDXRemote' cannot be used as a JSX component.
  return <MDXRemote source={source} components={components} />;
};
