import type * as React from 'react';
import { Platform, type View } from 'react-native';

/**
 * Renders a mounted view to a PNG and returns something saveable: a
 * `data:` URI on web, a temp-file URI on native.
 *
 * Web uses html-to-image rather than react-native-view-shot's own web
 * path (html2canvas). html2canvas re-implements layout and text drawing
 * itself, and on this app's output it both lost NativeWind's classes
 * (its cloned document reorders the stylesheets, so react-native-web's
 * base rules win) and collapsed the spaces between words. html-to-image
 * inlines each node's computed style and lets the browser draw it, so
 * the image matches what the DOM really looks like.
 */
export async function captureViewToPng(ref: React.RefObject<View | null>, fileName: string) {
  if (Platform.OS !== 'web') {
    // Loaded on demand so its web build (which bundles html2canvas, unused
    // here) stays out of the web app's main bundle.
    const { captureRef } = await import('react-native-view-shot');
    // view-shot adds the extension itself (Android uses this as a prefix).
    return captureRef(ref, {
      format: 'png',
      result: 'tmpfile',
      fileName: fileName.replace(/\.png$/, ''),
    });
  }

  const { toPng } = await import('html-to-image');
  return toPng(ref.current as unknown as HTMLElement, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });
}
