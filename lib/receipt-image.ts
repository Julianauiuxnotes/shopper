import { Platform } from 'react-native';
import { LOGO_SVG, wrap } from './shipping-label';

// Receipts for 58 mm thermal paper, drawn onto a canvas as a PNG.
//
// Used by Cetak penanda (lib/penanda-image.ts) and Cetak tagihan
// (lib/tagihan-image.ts) for "Simpan foto": save the PNG, then print it
// from the thermal printer's own app (a phone browser can't reach a
// Bluetooth thermal printer).
//
// 58 mm paper has a 48 mm print area = 384 dots at 203 dpi. The layout
// is 384 points wide (one point = one printer dot), drawn at 2x so it
// stays sharp, in black only (grey prints faintly on thermal paper).

export type ReceiptBlock =
  | { type: 'logo'; src: string | null }
  | { type: 'center'; text: string; size?: number; bold?: boolean }
  | { type: 'space'; height: number }
  | { type: 'dashed' }
  | { type: 'rows'; rows: Array<[label: string, value: string, bold?: boolean]> }
  | { type: 'title'; text: string }
  | {
      type: 'item';
      name: string;
      detail: string;
      /** 'checked' / 'unchecked' box, or 'none' */
      box: 'checked' | 'unchecked' | 'none';
      bold?: boolean;
      /** Struck through (e.g. Tidak tersedia) */
      struck?: boolean;
      /** Extra line under the detail, e.g. "Tidak tersedia · Tidak ditagih" */
      note?: string;
    }
  | { type: 'rule' }
  | { type: 'amount'; label: string; value: string }
  | { type: 'box'; title: string; lines: Array<{ text: string; bold?: boolean }> }
  | { type: 'text'; text: string; size?: number; bold?: boolean };

export const canMakeReceiptImage = Platform.OS === 'web';

const SCALE = 2;
const WIDTH = 384;
const PAD_X = 12;
const INNER = WIDTH - PAD_X * 2;
const INK = '#000000';
const BODY = 18;
const LINE = 24;
const LABEL_COL = 158;
const FONT = (size: number, bold = false) =>
  `${bold ? 'bold ' : ''}${size}px ${bold ? 'Inter_700Bold' : 'Inter_400Regular'}, Inter, sans-serif`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image failed to load'));
    image.src = src;
  });
}

function loadBrandLogo() {
  const url = URL.createObjectURL(new Blob([LOGO_SVG], { type: 'image/svg+xml' }));
  return loadImage(url).finally(() => URL.revokeObjectURL(url));
}

/** Draws the blocks (plus the "Powered by Justipers" footer) and returns a PNG. */
export async function renderReceiptPng(blocks: ReceiptBlock[]): Promise<Blob> {
  if (!canMakeReceiptImage) throw new Error('Only available on web');
  await Promise.all(
    [14, 16, 18, 20, 24].flatMap((size) => [FONT(size), FONT(size, true)]).map((f) =>
      document.fonts.load(f)
    )
  ).catch(() => {});
  const logoBlock = blocks.find((b): b is Extract<ReceiptBlock, { type: 'logo' }> => b.type === 'logo');
  const [brand, logo] = await Promise.all([
    loadBrandLogo(),
    logoBlock?.src ? loadImage(logoBlock.src).catch(() => null) : Promise.resolve(null),
  ]);

  // Draw onto a tall scratch canvas, then copy the used part.
  const MAX_H = 8000;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = MAX_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, MAX_H);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.textBaseline = 'top';

  let y = 16;
  const strike = (x: number, width: number, top: number, size: number) => {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top + size * 0.55);
    ctx.lineTo(x + width, top + size * 0.55);
    ctx.stroke();
  };
  const leftLines = (text: string, x: number, maxW: number, size: number, bold = false, struck = false) => {
    ctx.font = FONT(size, bold);
    for (const line of wrap(ctx, text, maxW)) {
      ctx.fillText(line, x, y);
      if (struck) strike(x, ctx.measureText(line).width, y, size);
      y += Math.round(size * 1.35);
    }
  };
  const dashLine = (x1: number, x2: number, dash: [number, number], width: number) => {
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'logo': {
        if (!logo) break;
        const ratio = Math.min(160 / logo.width, 72 / logo.height);
        const w = logo.width * ratio;
        const h = logo.height * ratio;
        ctx.drawImage(logo, (WIDTH - w) / 2, y, w, h);
        y += h + 10;
        break;
      }
      case 'center': {
        const size = block.size ?? BODY;
        ctx.font = FONT(size, block.bold);
        ctx.textAlign = 'center';
        for (const line of wrap(ctx, block.text, INNER)) {
          ctx.fillText(line, WIDTH / 2, y);
          y += Math.round(size * 1.35);
        }
        ctx.textAlign = 'left';
        y += 4;
        break;
      }
      case 'space':
        y += block.height;
        break;
      case 'dashed':
        y += 10;
        dashLine(PAD_X, WIDTH - PAD_X, [6, 4], 2);
        y += 16;
        break;
      case 'rule':
        y += 4;
        dashLine(PAD_X, WIDTH - PAD_X, [3, 3], 1);
        y += 12;
        break;
      case 'rows':
        for (const [label, value, bold] of block.rows) {
          const top = y;
          ctx.font = FONT(BODY);
          const labelLines = wrap(ctx, label, LABEL_COL - 6);
          labelLines.forEach((line, i) => ctx.fillText(line, PAD_X, top + i * LINE));
          ctx.fillText(':', PAD_X + LABEL_COL, top);
          const valueX = PAD_X + LABEL_COL + 10;
          ctx.font = FONT(BODY, !!bold);
          const valueLines = wrap(ctx, value, WIDTH - PAD_X - valueX);
          valueLines.forEach((line, i) => ctx.fillText(line, valueX, top + i * LINE));
          y = top + Math.max(labelLines.length, valueLines.length) * LINE + 6;
        }
        break;
      case 'title':
        ctx.font = FONT(20, true);
        ctx.fillText(block.text, PAD_X, y);
        y += 30;
        break;
      case 'item': {
        const box = 16;
        let textX = PAD_X;
        if (block.box !== 'none') {
          ctx.lineWidth = 1.6;
          ctx.strokeRect(PAD_X + 0.8, y + 3.8, box - 1.6, box - 1.6);
          if (block.box === 'checked') {
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(PAD_X + 3.5, y + 11.5);
            ctx.lineTo(PAD_X + 7, y + 15);
            ctx.lineTo(PAD_X + 13, y + 6.5);
            ctx.stroke();
          }
          textX = PAD_X + box + 8;
        }
        const maxW = WIDTH - PAD_X - textX;
        leftLines(block.name, textX, maxW, BODY, block.bold, block.struck);
        if (block.detail) leftLines(block.detail, textX, maxW, BODY, false, block.struck);
        if (block.note) leftLines(block.note, textX, maxW, 16, true);
        y += 4;
        break;
      }
      case 'amount':
        leftLines(block.label, PAD_X, INNER, 16, true);
        y += 2;
        leftLines(block.value, PAD_X, INNER, 22, true);
        y += 8;
        break;
      case 'box': {
        const top = y;
        y += 10;
        leftLines(block.title, PAD_X + 10, INNER - 20, 16, true);
        y += 2;
        for (const line of block.lines) {
          leftLines(line.text, PAD_X + 10, INNER - 20, line.bold ? BODY : 16, line.bold);
          if (!line.bold) y += 4;
        }
        y += 6;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(PAD_X + 0.75, top + 0.75, INNER - 1.5, y - top - 1.5);
        y += 12;
        break;
      }
      case 'text':
        leftLines(block.text, PAD_X, INNER, block.size ?? 16, block.bold);
        y += 4;
        break;
    }
  }

  // Footer
  y += 6;
  ctx.font = FONT(14);
  ctx.textAlign = 'center';
  ctx.fillText('Powered by:', WIDTH / 2, y);
  ctx.textAlign = 'left';
  y += 20;
  const bw = 96;
  const bh = (bw * 45) / 130;
  ctx.drawImage(brand, (WIDTH - bw) / 2, y, bw, bh);
  y += bh + 24;

  const out = document.createElement('canvas');
  out.width = WIDTH * SCALE;
  out.height = Math.ceil(y) * SCALE;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('canvas unavailable');
  octx.drawImage(canvas, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('could not create the image');
  return blob;
}

/** Android browsers: their share sheet has no "save to gallery" option. */
export function isAndroidBrowser() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/**
 * Saves the PNG.
 * - iPhone/iPad: opens the share sheet, where "Save Image" puts it in
 *   Photos (or it can go straight to the printer app). Must be called
 *   straight from the tap, with the PNG already rendered: Safari only
 *   allows the share sheet during a user gesture.
 * - Android and computers: downloads the file. Android's share sheet only
 *   lists apps (WhatsApp, Drive, Photos "upload"…), with no way to save,
 *   while a download lands in the Download folder, which the gallery
 *   shows as its "Download" album and printer apps can pick from.
 */
export async function saveReceiptImage(
  blob: Blob,
  fileName: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (!isAndroidBrowser() && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // fall through to a plain download
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
