import type { MDXRemoteSerializeResult } from 'next-mdx-remote';
import type { serialize } from 'next-mdx-remote/serialize';

type SerializeOptions = NonNullable<Parameters<typeof serialize>[1]>;

export type { MDXRemoteSerializeResult as MDXCompiledResult, SerializeOptions };
