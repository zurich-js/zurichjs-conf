import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Preconnect to Stripe for faster checkout */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />

        {/* Preconnect to Supabase */}
        <link rel="dns-prefetch" href="https://supabase.co" />

        {/* Preconnect to PostHog analytics */}
        <link rel="dns-prefetch" href="https://eu.i.posthog.com" />

        {/* Base meta tags */}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        <meta name="author" content="ZurichJS - Swiss JavaScript Group" />
        <meta name="publisher" content="ZurichJS" />

        {/* Geo tags for local SEO */}
        <meta name="geo.region" content="CH-ZH" />
        <meta name="geo.placename" content="Zürich" />
        <meta name="geo.position" content="47.3903;8.5157" />
        <meta name="ICBM" content="47.3903, 8.5157" />

        {/* Language alternatives */}
        <link rel="alternate" hrefLang="en" href="https://conf.zurichjs.com" />
        <link rel="alternate" hrefLang="x-default" href="https://conf.zurichjs.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
