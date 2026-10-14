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
  const year = String(now.getFullYear()).slice(-2);
  const date = `${year}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
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
export function downloadFile(file, filename) {
  const isBlob = file instanceof Blob;
  const link = document.createElement('a');
  link.href = isBlob ? URL.createObjectURL(file) : file;
  link.download = filename;
  link.click();
  if (isBlob) setTimeout(() => URL.revokeObjectURL(link.href), LINK_LIFETIME);
}
