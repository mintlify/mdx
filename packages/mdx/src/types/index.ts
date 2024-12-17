import type { SerializeOptions, SerializeResult } from 'next-mdx-remote-client/serialize';

type SerializeSuccess = Omit<SerializeResult, 'error'>;

export type { SerializeOptions, SerializeResult, SerializeSuccess };
