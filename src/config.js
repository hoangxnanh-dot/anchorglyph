// Your project settings.
//
// The colors here are the starting values. The control panel changes them
// while the sketch runs; this is just what it opens with.
//
// Colors are written as r, g, b, each one a number from 0 to 255.

// The name your exported images get — no spaces, no slashes.
export const screenshotName = 'Anchorglyph';

// The project's name: on the left of the title bar across the top of the
// window, and at the bottom of the library.
export const projectTitle = 'Anchorglyph';
// A short line about the project, on the right of the title bar and below
// the name at the bottom of the library.
export const projectSubtitle = 'Experimental Type Tool';

// The font for 'Glyph' mode: a file in the fonts folder, written without its
// extension. Leave it as '' to use whichever font comes first alphabetically.
// The anchor numbers are written in it too. The panels and the rest of the
// page are always Space Grotesk, set in index.html.
export const startingFont = 'SpaceGrotesk-Regular';

// The library names saved variations with this text and a number after it,
// like "V – 01", "V – 02". Write any spaces or dashes you want before the number.
export const variationName = 'V—';
// How many digits the number has at least; zeros fill the front.
// 2 gives 01, 02 … 10; 3 gives 001; 1 gives plain 1, 2, 3.
export const variationDigits = 2;

// The text the sketch opens with. You can change it in the panel while it runs.
export const startingText = '//';

// The width and height of the grid in pixels. It sits in the middle of the
// window, whatever the window's size.
export const gridSize = 800;

// PNG and SVG downloads use this height. The drawing stays responsive on
// screen; only the downloaded artwork is fixed at this resolution.
export const exportSize = 2400;

// a light paper, with dark ink on it
export const backgroundColor = { r: 242, g: 242, b: 240 };
export const foregroundColor = { r: 40, g: 40, b: 40 };
// the guides: the lines between anchors, the anchor points and their numbers.
// Also the color of selected cards and switched-on buttons in the library.
// A green dark enough to read on the light paper.
export const accentColor = { r: 20, g: 196, b: 40 };

// The other end of the gradients, while Gradient in the Colors folder is
// on: the drawing runs from foregroundColor to foregroundEndColor, the
// background from backgroundColor to backgroundEndColor (Main 2 and
// Background 2 in the panel). Make an end the same as its start to keep
// that part one color.
export const foregroundEndColor = { r: 40, g: 90, b: 230 };
export const backgroundEndColor = { r: 214, g: 214, b: 206 };
