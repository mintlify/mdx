import { MDXClient as BaseMDXClient, MDXClientProps } from 'next-mdx-remote-client/csr';

import { Popup, PopupContent, PopupTrigger } from '../plugins/index.js';

export function MDXClient(props: MDXClientProps) {
  const mergedComponents = {
    Popup,
    PopupContent,
    PopupTrigger,
    ...props.components,
  };

  return <BaseMDXClient {...props} components={mergedComponents} />;
}
