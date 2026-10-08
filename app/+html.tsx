import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
// Files in /public are served from the site root, which on GitHub Pages
// is the /shopper subpath (see app.config.js) — the same env var the CI
// export sets, so these links resolve in both local dev and production.
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? '';

const IOS_NO_FOCUS_ZOOM = `
@supports (-webkit-touch-callout: none) {
  input, textarea, select { font-size: 16px !important; }
}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="id" className="bg-background">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* maximum-scale=1: iPhone browsers zoom the page in when a field
            with text under 16px is focused (ours are 12px) and stay zoomed
            afterwards, e.g. on the dashboard right after logging in. This
            stops that; pinch-to-zoom still works on iPhone. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="description" content="Kelola jastip tanpa ribet." />

        {/* Installable web app: "Add to Home Screen" opens it full-screen
            (no browser bars) with the brand colour on the status bar. */}
        <link rel="manifest" href={`${BASE_URL}/manifest.json`} />
        <meta name="theme-color" content="#e36200" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Shopper" />
        <link rel="apple-touch-icon" href={`${BASE_URL}/icon-192.png`} />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* iPhone browsers zoom the page in when a focused field's text is
            under 16px, and not all of them obey maximum-scale above. So on
            iOS only (the @supports test is true just there) every field's
            text is 16px, which never triggers the zoom. */}
        <style dangerouslySetInnerHTML={{ __html: IOS_NO_FOCUS_ZOOM }} />

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}
