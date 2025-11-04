import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Figtree } from "next/font/google";
import { MotionProvider } from "@/contexts/MotionContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { useState } from "react";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  // Create a stable query client instance per request
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <main className={figtree.variable}>
          <Component {...pageProps} />
        </main>
      </MotionProvider>
    </QueryClientProvider>
  );
}
