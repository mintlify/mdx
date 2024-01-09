import "@/styles/globals.css";
import "@mintlify/mdx/dist/styles.css";

import { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
