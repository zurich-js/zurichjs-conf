import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Figtree } from "next/font/google";
import { MotionProvider } from "@/contexts/MotionContext";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MotionProvider>
      <main className={figtree.variable}>
        <Component {...pageProps} />
      </main>
    </MotionProvider>
  );
}
