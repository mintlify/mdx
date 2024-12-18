import type { SerializeOptions, SerializeResult } from 'next-mdx-remote-client/serialize';

type SerializeSuccess = SerializeResult & { compiledSource: string };

export type { SerializeOptions, SerializeResult, SerializeSuccess };
