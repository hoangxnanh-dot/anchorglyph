// THE ICONS
//
// Every icon in the control panel, the library and the title bar, in one
// place. They are small SVG drawings, written as text, that a button takes
// as its innerHTML:
//
//   button.innerHTML = PLAY_ICON;
//
// They are drawn in `currentColor`, the color of the text around them, so
// an icon always matches the label next to it.

// How wide and tall an icon is on screen, in pixels.
const ICON_SIZE = 16;
// Every icon is drawn on a field this many units wide and tall, and scaled
// to ICON_SIZE on screen.
const ICON_FIELD = 24;
// How many dots across and down the project's mark has.
const MARK_DOTS = 3;

// A line drawing on the icon field, like the icons of most design tools.
// `shapes` are the SVG shapes inside it.
function lineIcon(shapes) {
  return `<svg viewBox="0 0 ${ICON_FIELD} ${ICON_FIELD}" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`;
}

// Close, Delete: an x
export const CLOSE_ICON = lineIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>');
// Load: an arrow to the right
export const ARROW_ICON = lineIcon('<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>');
// Save Iteration: a floppy disk
export const SAVE_ICON = lineIcon('<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><polyline points="7 3 7 8 15 8"/><rect x="7" y="13" width="10" height="8"/>');
// PNG: a picture with a mountain and a sun
export const IMAGE_ICON = lineIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>');
// SVG: a sheet of paper with a folded corner
export const FILE_ICON = lineIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
// Anchors: a curve with an anchor point and its two handles, as in Illustrator
// MP4: a frame of film with a play triangle in it
export const VIDEO_ICON = lineIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><polygon points="10 9 15 12 10 15 10 9"/>');
// Background: a square with stripes across it, like a filled area
export const BACKGROUND_ICON = lineIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="13" x2="13" y2="3"/><line x1="5" y1="21" x2="21" y2="5"/><line x1="13" y1="21" x2="21" y2="13"/>');
export const ANCHOR_ICON = lineIcon('<path d="M3 19C7 9 17 9 21 19"/><line x1="5" y1="12" x2="19" y2="12"/><rect x="10" y="10" width="4" height="4"/><circle cx="4" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>');

// The eye on the Grid and Anchors folders: open while they show,
// crossed out while they are hidden
export const EYE_OPEN_ICON = lineIcon('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>');
export const EYE_CLOSED_ICON = lineIcon('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="21" x2="21" y2="3"/>');
// Randomize: two crossing arrows, the "shuffle" sign of music players
export const RANDOMIZE_ICON = lineIcon('<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>');
// Restart: an arrow turning back on itself
export const RESTART_ICON = lineIcon('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>');
// Clear: an eraser, tilted, on the line it wipes clean
export const CLEAR_ICON = lineIcon('<path d="M7 21l-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21"/><line x1="22" y1="21" x2="7" y2="21"/><line x1="5" y1="11" x2="14" y2="20"/>');
// More: three dots in a row
export const MORE_ICON = lineIcon('<circle cx="5" cy="12" r="0.75"/><circle cx="12" cy="12" r="0.75"/><circle cx="19" cy="12" r="0.75"/>');

// The buttons that fold the panels away, at both ends of the title bar.
// Library: two papers stacked, a sheet in front and the edge of the one
// behind it.
export const LIBRARY_ICON = lineIcon('<rect x="3" y="7" width="14" height="14" rx="1.5"/><path d="M7 3h12.5A1.5 1.5 0 0 1 21 4.5V17"/>');
// Controls: three lines, the "menu" sign
export const MENU_ICON = lineIcon('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>');

// Playback: filled shapes, so they read as buttons from afar
// Play: a triangle pointing right. Shown while the drawing is paused.
export const PLAY_ICON = lineIcon('<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>');
// Pause: two upright bars. Shown while the drawing runs.
export const PAUSE_ICON = lineIcon('<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>');
// Stop: a square
export const STOP_ICON = lineIcon('<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>');

// A square of dots, `dotsPerSide` across and down, `size` pixels wide: the
// project's mark at the bottom of the library, and the Grid button's
// icon. The dots sit in the middle of equal cells.
export function dotGridIcon(dotsPerSide = MARK_DOTS, size = ICON_SIZE) {
  const cell = ICON_FIELD / dotsPerSide;
  const dots = [];
  for (let row = 0; row < dotsPerSide; row++) {
    for (let column = 0; column < dotsPerSide; column++) {
      dots.push(`<circle cx="${(column + 0.5) * cell}" cy="${(row + 0.5) * cell}" r="1.1"/>`);
    }
  }
  return `<svg viewBox="0 0 ${ICON_FIELD} ${ICON_FIELD}" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${dots.join('')}</svg>`;
}
