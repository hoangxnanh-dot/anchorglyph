// SAVING IMAGES
//
// Clicking Export PNG lands here, and Export SVG too.
//
// The file is named after `screenshotName` in src/config.js, followed by the
// date and time, so two exports never overwrite each other. Change the line
// in savePNG() if you want a different name or a different format.

import { screenshotName } from '../config.js';

// Builds the date-and-time part of the filename.
// '260921-1408' means 21 September 2026, at 14:08.
export const timestamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  //getMonth() counts from zero, so January is 0
  const yearDigits = String(now.getFullYear()).slice(-2);
  const date = `${yearDigits}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `${date}-${time}`;
};

// Saves whatever is on the canvas right now into your Downloads folder.
// 'jpg' and 'webp' work here too.
export function savePNG() {
  saveCanvas(`${screenshotName}-${timestamp()}`, 'png');
}

// Saves an SVG file into your Downloads folder. `lines` is the file's text
// as a list of lines, from <svg ...> down to </svg>. p5's saveStrings()
// writes any text file; 'svg' as the extension makes it an image.
export function saveSVG(lines) {
  saveStrings(lines, `${screenshotName}-${timestamp()}`, 'svg');
}

// Downloading a file the browser already holds: once the download has
// started, the temporary link to a Blob is freed again after this many
// milliseconds.
const LINK_LIFETIME = 1000;

// Saves a file that is already made into your Downloads folder, under
// `filename`. Used by the library to export saved variations. `file` is
// either a data URL (text starting with "data:", like a canvas picture) or
// a Blob (a file kept in the browser's memory).
export function saveToDownloads(file, filename) {
  const isBlob = file instanceof Blob;
  const link = document.createElement('a');
  link.href = isBlob ? URL.createObjectURL(file) : file;
  link.download = filename;
  link.click();
  if (isBlob) setTimeout(() => URL.revokeObjectURL(link.href), LINK_LIFETIME);
}

// Saves several files at once. `entries` is a list of { file, filename },
// each file as saveToDownloads() takes it.
// A phone or tablet lets a page download only one file per tap, so there
// the downloads after the first would be blocked. Instead, all the files go
// to the share sheet together: on an iPhone, "Save Images" puts them in
// Photos and "Save to Files" in a folder. Computers download them as usual.
export function saveAllToDownloads(entries) {
  const files = entries.map(({ file, filename }) => toFile(file, filename));
  // a finger, not a mouse: a phone or tablet
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  if (files.length > 1 && isTouchDevice && navigator.canShare?.({ files })) {
    // closing the share sheet without picking anything counts as an error;
    // nothing needs to happen then
    navigator.share({ files }).catch(() => {});
    return;
  }
  for (const { file, filename } of entries) saveToDownloads(file, filename);
}

// The share sheet takes File objects: a Blob with a name. A data URL is
// "data:image/png;base64," followed by the file's bytes written as text;
// atob() turns that text back into the bytes.
function toFile(file, filename) {
  if (file instanceof Blob) return new File([file], filename, { type: file.type });
  const [header, base64Text] = file.split(',');
  const type = header.slice('data:'.length, header.indexOf(';'));
  const bytes = Uint8Array.from(atob(base64Text), (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type });
}

// Copies the part of `source` (a canvas) inside `region`, { left, top,
// width, height } in the source's pixels, onto `context`, stretched to
// fill `targetWidth` × `targetHeight`. The region may reach past the
// source's edges: only the part inside is copied, and the rest of `context`
// keeps what is already there. (Browsers don't agree on what to do when
// asked to copy from outside a canvas; older Safari copies nothing at all.)
export function copyRegion(context, source, region, targetWidth, targetHeight) {
  const scaleX = targetWidth / region.width;
  const scaleY = targetHeight / region.height;
  const left = Math.max(0, region.left);
  const top = Math.max(0, region.top);
  const right = Math.min(source.width, region.left + region.width);
  const bottom = Math.min(source.height, region.top + region.height);
  if (right <= left || bottom <= top) return;
  context.drawImage(
    source,
    left, top, right - left, bottom - top,
    (left - region.left) * scaleX, (top - region.top) * scaleY, (right - left) * scaleX, (bottom - top) * scaleY,
  );
}
