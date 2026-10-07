import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Every photo the app takes in (event photo, receipt photos, the
// jastiper's logo) is shrunk to about this size as soon as it's picked,
// so that nothing bigger ever reaches storage — on the device today, and
// on Supabase once photos are uploaded there.
export const TARGET_IMAGE_BYTES = 200 * 1024;

export type CompressedImage = {
  /** file:// on native, blob: on web */
  uri: string;
  base64: string;
  bytes: number;
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png';
};

type Source = { uri: string; width: number; height: number };
type Step = { maxSide: number; quality: number };

async function render(source: Source, step: Step, format: SaveFormat): Promise<CompressedImage> {
  const longest = Math.max(source.width, source.height);
  const context = ImageManipulator.manipulate(source.uri);
  // Only ever scale down; `resize` with one side keeps the aspect ratio.
  if (longest > step.maxSide) {
    context.resize(
      source.width >= source.height ? { width: step.maxSide } : { height: step.maxSide }
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format, compress: step.quality, base64: true });
  const base64 = saved.base64 ?? '';
  return {
    uri: saved.uri,
    base64,
    bytes: Math.round(base64.length * 0.75),
    width: saved.width,
    height: saved.height,
    mimeType: format === SaveFormat.PNG ? 'image/png' : 'image/jpeg',
  };
}

// Tries each step in turn, from best quality down, and stops at the first
// one that fits the target. If none fits it returns the smallest attempt
// (the last step), which for these step lists is still close to the
// target for any ordinary photo.
async function compress(source: Source, steps: Step[], format: SaveFormat) {
  let result: CompressedImage | null = null;
  for (const step of steps) {
    const previous: CompressedImage | null = result;
    result = await render(source, step, format);
    // On web each attempt is a blob: URL that holds memory until revoked.
    if (previous && Platform.OS === 'web') URL.revokeObjectURL(previous.uri);
    if (result.bytes <= TARGET_IMAGE_BYTES) break;
  }
  return result as CompressedImage;
}

/** Event photos and receipt photos: JPEG, at most 1600px on the long side. */
export function compressPhoto(source: Source) {
  return compress(
    source,
    [
      { maxSide: 1600, quality: 0.8 },
      { maxSide: 1600, quality: 0.6 },
      { maxSide: 1280, quality: 0.6 },
      { maxSide: 1024, quality: 0.55 },
      { maxSide: 800, quality: 0.5 },
      { maxSide: 640, quality: 0.45 },
    ],
    SaveFormat.JPEG
  );
}

/**
 * The jastiper's logo. PNGs stay PNG so a transparent background
 * survives; PNG can't trade quality for size, so those shrink by
 * dimensions alone. The logo's largest slot is 101x47 points, so even the
 * smallest step here (360px) is sharp on a 3x screen.
 */
export function compressLogo(source: Source, isPng: boolean) {
  return isPng
    ? compress(
        source,
        [
          { maxSide: 600, quality: 1 },
          { maxSide: 480, quality: 1 },
          { maxSide: 360, quality: 1 },
        ],
        SaveFormat.PNG
      )
    : compress(
        source,
        [
          { maxSide: 600, quality: 0.85 },
          { maxSide: 600, quality: 0.7 },
          { maxSide: 480, quality: 0.6 },
        ],
        SaveFormat.JPEG
      );
}
