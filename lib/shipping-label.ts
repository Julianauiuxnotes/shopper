import { Platform } from 'react-native';

// "Cetak label pengiriman": the shipping label for a paid order (Figma
// node 254:78), saved as a PNG. The label is drawn straight onto a canvas
// from the order's own fields rather than captured from the screen, so it
// always comes out the same. Web only for now: saving a file on a phone
// app needs the native file/share modules, which the app doesn't include.

export type ShippingLabel = {
  namaCustomer: string;
  alamat: string;
  /** With its +62 prefix, or '' to leave the row out. */
  whatsapp: string;
  pengirim: string;
  /** With its +62 prefix, or '' to leave the row out. */
  teleponPengirim: string;
  fileName: string;
};

// Figma's measurements, in its 390-wide frame; drawn at 3x for print.
const SCALE = 3;
const WIDTH = 390;
const PADDING_X = 10;
const PADDING_Y = 24;
const SECTION_GAP = 24;
const FIELD_GAP = 18;
const LABEL_GAP = 3;
const FONT_SIZE = 20;
const LINE_HEIGHT = 24;
const INK = '#2d3748';
const DASH = '#9ca3af';
const LOGO_WIDTH = 143.723;
const LOGO_HEIGHT = 22.9191;
// The footer's right edge in the frame: its centre (195 + 98.86) plus half
// the logo's width.
const FOOTER_RIGHT = 195 + 98.86 + LOGO_WIDTH / 2;

const BOLD = `${FONT_SIZE}px Inter_700Bold, Inter, sans-serif`;
const REGULAR = `${FONT_SIZE}px Inter_400Regular, Inter, sans-serif`;
const FOOTER = '12px Poppins_400Regular, Poppins, sans-serif';

// The dark Shopper wordmark from the design, kept as markup so it can be
// painted onto the canvas.
const LOGO_SVG = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="143.723" height="22.9191" viewBox="0 0 143.723 22.9191" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="Group 4">
<path id="Vector" d="M138.53 22.6947L133.594 13.9759H131.478V22.6947H126.991V0.320561H135.389C137.12 0.320561 138.594 0.630422 139.812 1.25015C141.03 1.8485 141.939 2.67124 142.537 3.71836C143.157 4.74411 143.467 5.89807 143.467 7.18026C143.467 8.65478 143.039 9.99039 142.184 11.1871C141.33 12.3624 140.058 13.1745 138.37 13.6233L143.723 22.6947H138.53ZM131.478 10.6101H135.229C136.447 10.6101 137.355 10.3216 137.953 9.74464C138.552 9.14628 138.851 8.32355 138.851 7.27643C138.851 6.25068 138.552 5.46 137.953 4.90438C137.355 4.3274 136.447 4.0389 135.229 4.0389H131.478V10.6101Z" fill="#1F2937"/>
<path id="Vector_2" d="M114.418 3.94276V9.55233H121.951V13.1104H114.418V19.0405H122.912V22.6947H109.93V0.288521H122.912V3.94276H114.418Z" fill="#1F2937"/>
<path id="Vector_3" d="M106.744 7.24437C106.744 8.44108 106.455 9.56299 105.878 10.6101C105.323 11.6572 104.436 12.5013 103.218 13.1424C102.021 13.7835 100.504 14.1041 98.6661 14.1041H94.9157V22.6947H90.428V0.320561H98.6661C100.397 0.320561 101.872 0.619737 103.09 1.21809C104.308 1.81645 105.216 2.63918 105.814 3.6863C106.434 4.73342 106.744 5.91944 106.744 7.24437ZM98.4738 10.4819C99.7132 10.4819 100.632 10.2041 101.23 9.64847C101.829 9.07149 102.128 8.27012 102.128 7.24437C102.128 5.06465 100.91 3.97479 98.4738 3.97479H94.9157V10.4819H98.4738Z" fill="#1F2937"/>
<path id="Vector_4" d="M87.2419 7.24437C87.2419 8.44108 86.9534 9.56299 86.3764 10.6101C85.8208 11.6572 84.934 12.5013 83.7159 13.1424C82.5192 13.7835 81.0019 14.1041 79.1641 14.1041H75.4137V22.6947H70.9261V0.320561H79.1641C80.8951 0.320561 82.3696 0.619737 83.5877 1.21809C84.8058 1.81645 85.714 2.63918 86.3123 3.6863C86.9321 4.73342 87.2419 5.91944 87.2419 7.24437ZM78.9718 10.4819C80.2113 10.4819 81.1302 10.2041 81.7285 9.64847C82.3269 9.07149 82.626 8.27012 82.626 7.24437C82.626 5.06465 81.408 3.97479 78.9718 3.97479H75.4137V10.4819H78.9718Z" fill="#1F2937"/>
<path id="Vector_5" d="M38.6699 0.320561V22.6947H34.1822V13.1745H24.5979V22.6947H20.1102V0.320561H24.5979V9.52025H34.1822V0.320561H38.6699Z" fill="#1F2937"/>
<path id="Vector_6" d="M8.30216 22.9191C6.74217 22.9191 5.33176 22.652 4.07094 22.1178C2.8315 21.5835 1.84849 20.8142 1.12191 19.8098C0.395341 18.8054 0.0213698 17.6194 0 16.2518H4.8082C4.87231 17.1707 5.19286 17.8972 5.76984 18.4315C6.3682 18.9657 7.18025 19.2328 8.206 19.2328C9.25312 19.2328 10.0759 18.9871 10.6742 18.4956C11.2726 17.9827 11.5717 17.3202 11.5717 16.5082C11.5717 15.8457 11.3687 15.3008 10.9627 14.8734C10.5567 14.446 10.0438 14.1148 9.42408 13.8797C8.82572 13.6233 7.9923 13.3455 6.92381 13.0463C5.47067 12.6189 4.28464 12.2022 3.36574 11.7962C2.46821 11.3688 1.68821 10.7383 1.02575 9.90493C0.384656 9.05014 0.0641094 7.91754 0.0641094 6.50713C0.0641094 5.1822 0.395341 4.02823 1.0578 3.04522C1.72027 2.06221 2.64985 1.31427 3.84656 0.801396C5.04327 0.267152 6.41094 3.01898e-05 7.94956 3.01898e-05C10.2575 3.01898e-05 12.1274 0.566328 13.5591 1.69893C15.0123 2.81016 15.8136 4.37015 15.9632 6.37891H11.0268C10.9841 5.6096 10.6528 4.97919 10.0331 4.48769C9.43476 3.97481 8.63339 3.71837 7.62901 3.71837C6.75285 3.71837 6.04765 3.94276 5.51341 4.39152C5.00053 4.84029 4.74409 5.49206 4.74409 6.34686C4.74409 6.94521 4.93642 7.4474 5.32108 7.85343C5.7271 8.23808 6.21861 8.55863 6.79559 8.81507C7.39395 9.05014 8.22737 9.32794 9.29586 9.64849C10.749 10.0759 11.935 10.5033 12.8539 10.9307C13.7728 11.3581 14.5635 11.9992 15.226 12.854C15.8884 13.7088 16.2197 14.8307 16.2197 16.2197C16.2197 17.4164 15.9098 18.5276 15.2901 19.5534C14.6704 20.5791 13.7621 21.4019 12.5654 22.0216C11.3687 22.62 9.94764 22.9191 8.30216 22.9191Z" fill="#1F2937"/>
<path id="Vector_7" d="M65.8309 0.434551H43.9817C43.4549 0.434551 42.9497 0.647756 42.5772 1.02727C42.2047 1.40677 41.9954 1.9215 41.9954 2.45821V20.6711C41.9954 21.2078 42.2047 21.7225 42.5772 22.102C42.9497 22.4815 43.4549 22.6947 43.9817 22.6947H65.8309C66.3577 22.6947 66.863 22.4815 67.2355 22.102C67.608 21.7225 67.8172 21.2078 67.8172 20.6711V2.45821C67.8172 1.9215 67.608 1.40677 67.2355 1.02727C66.863 0.647756 66.3577 0.434551 65.8309 0.434551ZM54.9063 15.612C53.3264 15.6103 51.8117 14.9701 50.6946 13.832C49.5774 12.6938 48.9491 11.1506 48.9474 9.541C48.9474 9.27264 49.0521 9.01528 49.2383 8.82553C49.4246 8.63577 49.6772 8.52917 49.9406 8.52917C50.204 8.52917 50.4566 8.63577 50.6428 8.82553C50.8291 9.01528 50.9337 9.27264 50.9337 9.541C50.9337 10.6144 51.3523 11.6439 52.0973 12.4029C52.8423 13.1619 53.8527 13.5883 54.9063 13.5883C55.9599 13.5883 56.9704 13.1619 57.7154 12.4029C58.4604 11.6439 58.8789 10.6144 58.8789 9.541C58.8789 9.27264 58.9835 9.01528 59.1698 8.82553C59.356 8.63577 59.6087 8.52917 59.8721 8.52917C60.1355 8.52917 60.3881 8.63577 60.5743 8.82553C60.7606 9.01528 60.8652 9.27264 60.8652 9.541C60.8636 11.1506 60.2352 12.6938 59.1181 13.832C58.0009 14.9701 56.4862 15.6103 54.9063 15.612ZM43.9817 4.48186V2.45821H65.8309V4.48186H43.9817Z" fill="#1F2937"/>
</g>
</svg>`;

export const canPrintShippingLabel = Platform.OS === 'web';

/** Breaks text into lines no wider than `maxWidth`, honouring its own line breaks. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [''];
}

function loadLogo() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([LOGO_SVG], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('logo failed to load'));
    };
    image.src = url;
  });
}

type Row = { label: string; lines: string[] };

/** Draws the label and saves it through the browser's download. */
export async function downloadShippingLabel(label: ShippingLabel) {
  if (!canPrintShippingLabel) throw new Error('Label download is only available on web');
  // The fonts are already on the page; this only waits for them to be
  // ready to draw with.
  await Promise.all([BOLD, REGULAR, FOOTER].map((font) => document.fonts.load(font))).catch(
    () => {}
  );
  const logo = await loadLogo();

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canvas unavailable');
  measure.font = REGULAR;
  const textWidth = WIDTH - PADDING_X * 2;
  const row = (title: string, value: string): Row | null =>
    value.trim() ? { label: title, lines: wrap(measure, value.trim(), textWidth) } : null;
  const sections: Row[][] = [
    [
      row('Nama customer', label.namaCustomer),
      row('Alamat', label.alamat),
      row('No.Whatsapp', label.whatsapp),
    ],
    [row('Pengirim', label.pengirim), row('No. Telepon Jastip', label.teleponPengirim)],
  ].map((rows) => rows.filter((r): r is Row => r !== null));

  const rowHeight = (r: Row) => LINE_HEIGHT + LABEL_GAP + r.lines.length * LINE_HEIGHT;
  const sectionHeight = (rows: Row[]) =>
    rows.reduce((sum, r) => sum + rowHeight(r), 0) + Math.max(0, rows.length - 1) * FIELD_GAP;
  // Each section is followed by a dashed line; the footer sits 16 under
  // the last one.
  const footerHeight = 16 + 18 + LOGO_HEIGHT;
  const height =
    PADDING_Y +
    sections.reduce((sum, rows) => sum + sectionHeight(rows) + SECTION_GAP * 2, 0) -
    SECTION_GAP +
    footerHeight +
    PADDING_Y;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height) * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'middle';

  let y = PADDING_Y;
  for (const rows of sections) {
    rows.forEach((r, index) => {
      if (index > 0) y += FIELD_GAP;
      ctx.fillStyle = INK;
      ctx.font = BOLD;
      ctx.fillText(r.label, PADDING_X, y + LINE_HEIGHT / 2);
      y += LINE_HEIGHT + LABEL_GAP;
      ctx.font = REGULAR;
      for (const line of r.lines) {
        ctx.fillText(line, PADDING_X, y + LINE_HEIGHT / 2);
        y += LINE_HEIGHT;
      }
    });
    y += SECTION_GAP;
    ctx.strokeStyle = DASH;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y - 1);
    ctx.lineTo(WIDTH, y - 1);
    ctx.stroke();
    ctx.setLineDash([]);
    y += SECTION_GAP;
  }

  y += 16 - SECTION_GAP;
  ctx.fillStyle = '#1f2937';
  ctx.font = FOOTER;
  ctx.textAlign = 'center';
  ctx.fillText('Powered by:', FOOTER_RIGHT - LOGO_WIDTH / 2, y + 9);
  ctx.textAlign = 'left';
  ctx.drawImage(logo, FOOTER_RIGHT - LOGO_WIDTH, y + 18, LOGO_WIDTH, LOGO_HEIGHT);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('could not create the image');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = label.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
