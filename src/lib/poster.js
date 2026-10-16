// THE POSTER
//
// The Poster button in the library's preview puts a saved variation on a
// ready-made poster and saves it as a PDF file:
//
//   const file = await makePoster({ svgText, label });
//
//   svgText   the drawing as the preview shows it (an SVG file's text):
//             with or without its background, with the guides that show
//   label     the small line below the picture, like the file's name
//
// The poster is an A3 page, upright:
//
//   ANCHORGLYPH
//   // EXPERIMENTAL TYPE TOOL          // GENERATIVE TYPOGRAPHY
//   +----------------------------------------------+
//   |                                              |
//   |                 the drawing                  |
//   |                                              |
//   |                                      AN      |
//   |                                      GH      |
//   +----------------------------------------------+
//                                     // V-01-...
//
// The drawing sits in a tall panel in its background color, as wide as
// the page between the margins. It is made as large as the panel is tall:
// the grid's top and bottom edges meet the panel's, and its sides, wider
// than the panel, are cut off. The large letters run off the page on the
// right. They and the texts at the top come from src/config.js.
//
// The whole page is painted onto a canvas, sharp enough for print, and
// that picture is the PDF's one page. Every size below is a share of the
// page's width, so the layout keeps its proportions at any size.

import { projectTitle, projectSubtitle, posterTagline, posterLetters } from '../config.js';

// The page: A3 (297 × 420 mm), in the PDF's own unit, the point (1/72 inch).
const PAGE_WIDTH_POINTS = 841.89;
const PAGE_HEIGHT_POINTS = 1190.55;
// How many pixels wide the page's picture is; its height follows the page's
// shape. 3300 gives A3 about 280 pixels per inch, sharp enough for print,
// and stays below the 16.7 million pixels an iPhone can draw at once.
const POSTER_WIDTH = 3300;
// How the picture is packed into the PDF: as a JPEG at this quality (0 to
// 1). Higher keeps fine lines and grain crisper, but makes the file bigger.
const JPEG_QUALITY = 0.95;

// Where everything sits, as a share of the page's width
const layout = {
  margin: 0.05,              // the room on the left and right of the page
  labelSize: 0.011,          // the small capitals at the top and bottom
  labelTracking: 0.14,       // their letter spacing, as a share of their size
  firstBaseline: 0.053,      // the project's name, down from the top
  lineGap: 0.016,            // from the name down to the subtitle
  panelTop: 0.087,           // the drawing's panel, down from the top
  panelBottomGap: 0.068,     // from the panel's bottom to the page's bottom
  labelBottomGap: 0.044,     // from the line below the panel to the page's bottom
  letterSize: 0.257,         // the large letters
  letterLeft: 0.704,         // where they start, from the left
  letterLineHeight: 0.213,   // from one line of large letters to the next
  letterBottomGap: 0.025,    // from the last line's baseline to the panel's bottom
};
// The poster's colors
const colors = {
  page: { r: 255, g: 255, b: 255 },
  ink: { r: 0, g: 0, b: 0 },
  muted: { r: 136, g: 136, b: 136 },
};
// The weights of Space Grotesk used, from the fonts folder (see the
// @font-face rules in index.html)
const LABEL_WEIGHT = 400;
const LETTER_WEIGHT = 700;
const FONT_FAMILY = '"Space Grotesk"';

export async function makePoster({ svgText, label }) {
  const pageWidth = POSTER_WIDTH;
  const pageHeight = Math.round((POSTER_WIDTH * PAGE_HEIGHT_POINTS) / PAGE_WIDTH_POINTS);
  // every share in `layout`, in pixels
  const size = (share) => share * pageWidth;

  const canvas = document.createElement('canvas');
  canvas.width = pageWidth;
  canvas.height = pageHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = cssColor(colors.page);
  context.fillRect(0, 0, pageWidth, pageHeight);

  // the panel with the drawing in it
  const panel = {
    left: size(layout.margin),
    top: size(layout.panelTop),
    width: pageWidth - size(layout.margin) * 2,
  };
  panel.height = pageHeight - size(layout.panelBottomGap) - panel.top;
  const drawing = await loadSVG(svgForPanel(svgText, panel.height / panel.width));
  context.drawImage(drawing, panel.left, panel.top, panel.width, panel.height);

  // a canvas only draws with a font once it is loaded
  await document.fonts.load(`${LABEL_WEIGHT} ${size(layout.labelSize)}px ${FONT_FAMILY}`);
  await document.fonts.load(`${LETTER_WEIGHT} ${size(layout.letterSize)}px ${FONT_FAMILY}`);

  // the small capitals: the name and subtitle at the top left, the tagline
  // at the top right, the label below the panel on the right
  const labelFont = `${LABEL_WEIGHT} ${size(layout.labelSize)}px ${FONT_FAMILY}`;
  const tracking = size(layout.labelSize) * layout.labelTracking;
  const secondBaseline = size(layout.firstBaseline + layout.lineGap);
  const right = pageWidth - size(layout.margin);
  context.font = labelFont;
  drawSpacedText(context, projectTitle.toUpperCase(), panel.left, size(layout.firstBaseline), tracking, colors.ink, 'left');
  drawSpacedText(context, `// ${projectSubtitle.toUpperCase()}`, panel.left, secondBaseline, tracking, colors.muted, 'left');
  drawSpacedText(context, `// ${posterTagline.toUpperCase()}`, right, secondBaseline, tracking, colors.muted, 'right');
  drawSpacedText(context, label.toUpperCase(), right, pageHeight - size(layout.labelBottomGap), tracking, colors.muted, 'right');

  // the large letters, the last line resting just above the panel's bottom
  // edge and the lines above it stacked upwards. Whatever runs past the
  // page's right edge is cut off.
  const lines = posterLetters;
  context.font = `${LETTER_WEIGHT} ${size(layout.letterSize)}px ${FONT_FAMILY}`;
  context.fillStyle = cssColor(colors.ink);
  context.textAlign = 'left';
  const lastBaseline = panel.top + panel.height - size(layout.letterBottomGap);
  // The letters stand in columns. The top line is set as usual; on the
  // lines below, every letter after the first starts exactly where the
  // letter above it starts, like the H's stem right under the N's. "Starts"
  // means where its ink begins, not its box: letters have different empty
  // room on their left (their side bearing), so the spacing between the
  // letters is adjusted to make up for it.
  const letterLeft = size(layout.letterLeft);
  const topLine = [...lines[0]];
  const columnStarts = topLine.map((letter, index) => {
    const letterX = letterLeft + context.measureText(topLine.slice(0, index).join('')).width;
    return letterX + inkStart(context, letter);
  });
  lines.forEach((line, lineIndex) => {
    const linesBelow = lines.length - 1 - lineIndex;
    const baseline = lastBaseline - linesBelow * size(layout.letterLineHeight);
    let letterX = letterLeft;
    [...line].forEach((letter, index) => {
      // under a letter of the top line: in its column. Further right than
      // the top line reaches: simply after the letter before.
      if (index > 0 && index < columnStarts.length) letterX = columnStarts[index] - inkStart(context, letter);
      context.fillText(letter, letterX, baseline);
      letterX += context.measureText(letter).width;
    });
  });

  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  const jpegBytes = new Uint8Array(await jpeg.arrayBuffer());
  return pdfWithPicture(jpegBytes, pageWidth, pageHeight);
}

// The drawing's SVG cut to the panel's shape (`panelShape` is the panel's
// height divided by its width): exactly as tall as the grid, from its top
// edge to its bottom edge, and as wide as that shape allows, around the
// grid's middle. The grid's sides reach past it and are cut off. The
// background, the line marked class="background", is made to fill the
// whole panel, so it is one color, or one gradient, all over.
function svgForPanel(svgText, panelShape) {
  const lines = svgText.split('\n');
  // the first line is the opening <svg ...> tag, with the file's size and
  // the part of the drawing it shows (viewBox: left, top, width, height).
  // The grid's top left corner is at 0, 0, and the saved square reaches
  // past it by the same amount on every side (`top` is that, below 0).
  const [, top, , height] = lines[0].match(/viewBox="([^"]*)"/)[1].split(' ').map(Number);
  const gridSize = height + top * 2;
  const panelWidth = gridSize / panelShape;
  const panelLeft = (gridSize - panelWidth) / 2;
  const place = `x="${panelLeft}" y="0" width="${panelWidth}" height="${gridSize}"`;
  lines[0] = lines[0].replace(
    /width="[^"]*" height="[^"]*" viewBox="[^"]*"/,
    `width="${panelWidth}" height="${gridSize}" viewBox="${panelLeft} 0 ${panelWidth} ${gridSize}"`,
  );
  return lines.map((line) => {
    if (!line.includes('class="background"')) return line;
    return line.replace(/ x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*"/, ` ${place}`);
  }).join('\n');
}

// An SVG file's text as a picture a canvas can draw, once the browser has
// unpacked it
async function loadSVG(svgText) {
  const picture = new Image();
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  await picture.decode();
  return picture;
}

// Writes `text` with `spacing` pixels between its letters, like the
// letter-spacing of the small labels on the page, ending at `x` when
// `align` is 'right'. Letter by letter, so it works in every browser.
function drawSpacedText(context, text, x, baseline, spacing, color, align) {
  const letters = [...text];
  const widths = letters.map((letter) => context.measureText(letter).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);
  let letterX = align === 'right' ? x - totalWidth : x;
  context.fillStyle = cssColor(color);
  context.textAlign = 'left';
  letters.forEach((letter, index) => {
    context.fillText(letter, letterX, baseline);
    letterX += widths[index] + spacing;
  });
}

// How far right of where a letter is drawn its ink begins, in pixels, in
// the context's font. The browser measures it: actualBoundingBoxLeft is
// how far the ink reaches to the left of that point, so its opposite.
function inkStart(context, letter) {
  return -context.measureText(letter).actualBoundingBoxLeft;
}

function cssColor({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

// A PDF file with one A3 page, filled with one JPEG picture (`jpegBytes`,
// `pixelWidth` × `pixelHeight` pixels). A PDF is a list of numbered
// objects (the catalog, the list of pages, the page, the picture, and the
// page's drawing instructions); at the end, a table says where in the file
// each object starts, counted in bytes, so a reader can find them.
function pdfWithPicture(jpegBytes, pixelWidth, pixelHeight) {
  const encoder = new TextEncoder();
  const parts = [];
  const objectStarts = [];
  let byteCount = 0;
  function add(part) {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    parts.push(bytes);
    byteCount += bytes.length;
  }
  function startObject(number) {
    objectStarts[number] = byteCount;
    add(`${number} 0 obj\n`);
  }

  // "draw the picture called /Poster across the whole page"
  const pageDrawing = `q ${PAGE_WIDTH_POINTS} 0 0 ${PAGE_HEIGHT_POINTS} 0 0 cm /Poster Do Q`;

  add('%PDF-1.4\n');
  startObject(1);
  add('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH_POINTS} ${PAGE_HEIGHT_POINTS}] `
    + '/Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
  startObject(4);
  add(`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} `
    + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  add(jpegBytes);
  add('\nendstream\nendobj\n');
  startObject(5);
  add(`<< /Length ${pageDrawing.length} >>\nstream\n${pageDrawing}\nendstream\nendobj\n`);

  // the table of where each object starts: every line exactly 20 bytes
  const tableStart = byteCount;
  const objectCount = objectStarts.length;
  const tableLines = objectStarts.slice(1).map((start) => `${String(start).padStart(10, '0')} 00000 n \n`);
  add(`xref\n0 ${objectCount}\n0000000000 65535 f \n${tableLines.join('')}`);
  add(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${tableStart}\n%%EOF\n`);

  return new Blob(parts, { type: 'application/pdf' });
}
