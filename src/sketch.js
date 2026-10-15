// Project: Anchorglyph – Xuan Nam Anh Hoang & Quang Chien Nguyen @HTW-Berlin, 2026
//
// Inspired by »SAND CREATURES« from Anders Hoff – inconvergent:
// https://inconvergent.net/generative/sand-creatures/
//
// Fineliner Spline Style code based on: https://github.com/inconvergent/sand-spline
// Code translated and edited from Python to p5 with Claude Code
//
// Grid Template provided by Bernhard Hoffmann
//
//
// Start screen
//
// The sketch opens on a start screen: point at a mode to see it drawn on
// the left, click it to start working in that mode. See src/lib/start.js.
//
// Concept
//
// The tool generates random anchor points within a grid
// and connects them using B-spline curves, creating abstract shapes
// that continuously evolve. Anchor points can be added, moved,
// or removed with a mouse click.
//
// Text can also serve as a source for generating anchor points,
// making it easy to explore experimental letterforms, shapes,
// and figures in a wide range of variations.
//
//
// Controls
//
// Click a cell        Add an anchor there (it goes to the end of the order),
//                     or remove the anchor that is already there.
// Drag an anchor      Move it around the grid. When you let go, it jumps
//                     to the centre of the cell you drop it in.
// Click an anchor     (without dragging) remove it.
// Single / Multiple   In the Modes section: one drawing in the middle, or
//                     several iterations at once (Per Row sets how many).
//                     Each iteration joins the anchors in its own order and
//                     picks its own Drift and Speed; the grid, the anchor
//                     positions, the style and the colors stay yours.
//                     In Multiple, a click on one iteration saves it to the
//                     library; Save Iteration saves the whole sheet.
// Double-click a name In the control panel: put that setting back to where
//                     it started.
//
// Arrows icon         (crossing arrows) New random values for the folder whose
//                     title it sits in.
// Randomize All       New grid, anchors, spline, colors, gradient, drift and
//                     speed at once. In 'Glyph' it also types a new text of
//                     1 to 3 characters.
// Dots (···)          On the Controls headline: close every folder, or open
//                     them all again (same as the T key).
// Iterate             Keep the same cells, connect them in a new order.
// Clear / Restore     Remove every anchor. In 'Glyph' it is called Restore
//                     and brings back the anchors of the text instead.
//
// Modes: Glyph | Shape | Animation
//                     'Glyph' uses the anchor points of the text, read from the font file.
//                     'Shape' uses the grid anchors above.
//                     'Animation' is like 'Shape', but anchors, shapes and lines also grow and shrink.
// Eye icons           The eye on the Grid and Anchors folders hides or shows
//                     the grid, or the anchors and their numbers.
// H – Hide Guides     Hide or show the grid and the anchors together.
// Invert              The switch next to the Modes headline: light becomes
//                     dark and dark becomes light, in the panels and in the
//                     drawing (Main and Background). The accent stays.
// G – Hide UI         Hide or show the control panel, the library, the
//                     title bar and the labels around the grid.
// T – Toggle folders  Close every folder in the control panel, or open them
//                     all again if they are all closed. Modes stays open.
// Space – Pause/Play  Pause or continue the animation.
// Playback            Restart draws from the beginning, Play/Pause pauses or
//                     continues, Stop starts over and waits for Play. The
//                     bar shows how far the Animation loop has come; drag
//                     it to jump to another moment of the loop.
// R – Randomize All   Randomize EVERYTHING.
// C – Reset All       Every setting back to how the sketch opens (same as
//                     the Reset All button). The mode stays.
// Left / Right        New random anchors (same as the Anchors arrows), not in 'Glyph'.
// S – Save Iteration  Keep the drawing in the library (same as the library's
//                     Save Iteration button). It also keeps a video of the
//                     drawing, from its start up to now, to export as MP4
//                     from the library's preview.
//
// The library on the left keeps saved variations for this page visit: the
// drawing itself, the anchors and every setting in the panel. Load one to
// continue drawing it, to change it further or to start a new variation
// from it. Select several to delete or export them at once. Reloading the
// page clears the library. See src/lib/library.js.
//
// Clearing, iterating or changing anchors always restarts the drawing, even
// if it was paused, so the lines keep being drawn.
//
// Note: this is p5 version 2. Tutorials that use `preload()` are written for
// p5 version 1 and will not work here. See the README.

import p5 from 'p5';
import {
  createGUI, addSwitch, addCycler, addEyeToggle, addRandomizeIcon, addSubheading, applyAccentColor, createSwitchButton,
  makeButton, makeIconButton, setButtonIcon,
} from './lib/gui.js';
import { createLibrary } from './lib/library.js';
import { createPanelButtons } from './lib/panels.js';
import {
  gridSize, backgroundColor, foregroundColor, accentColor, foregroundEndColor, backgroundEndColor,
  startingText, projectTitle, projectSubtitle,
} from './config.js';
import { applyFont, defaultFont, textToCurves } from './lib/font/index.js';
import { createStartScreen, START_TRANSITION_DURATION } from './lib/start.js';
import { traceOutlines, outlinesToPathData } from './lib/trace.js';
import { createVideoRecorder, createFrameReader, mp4File } from './lib/video.js';
import { Easings } from './lib/easings.js';
import {
  RANDOMIZE_ICON, RESTART_ICON, MORE_ICON, PLAY_ICON, PAUSE_ICON, STOP_ICON, SAVE_ICON, RESET_ICON,
} from './lib/icons.js';

// The speed the sketch opens with: a quarter of NORMAL_SPEED, so the curve
// builds up slowly and the anchors stay calm.
const STARTING_SPEED = 0.375;
// At this speed the anchors drift by the normal amount; faster speeds shake
// them more, slower ones calm them down.
const NORMAL_SPEED = 1.5;
// The range of the Speed slider in the Drift folder. It goes low enough to
// hold the starting speed.
const speedRange = { min: 0.1, max: 2.5, step: 0.05 };
// The range of the Drift slider above it, in cells: how far an anchor may
// wander from its spot. Anchors never leave the grid, whatever the setting.
const driftReachRange = { min: 0.5, max: 10, step: 0.5 };

// The grid the sketch opens with.
const STARTING_COLUMNS = 20;
const STARTING_ROWS = 20;

// The fewest and most columns and rows the grid can have. The sliders
// move in whole steps, since there is no half a column. The arrows on the
// Grid folder pick at least RANDOM_GRID_MIN, so the grid never ends up as
// one or two big cells.
// 39 puts the starting 20 exactly in the middle of the sliders (19 steps
// on either side), so their handles line up with the Slant slider below.
const GRID_MIN = 1;
const GRID_MAX = 39;
const GRID_STEP = 1;
const RANDOM_GRID_MIN = 3;

// Randomize All in 'Glyph' mode also types a new text: this many characters
// (at least min, at most max), each picked from randomTextCharacters.
const randomTextLength = { min: 1, max: 3 };
const randomTextCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// The range of the Slant slider in the Grid folder, in degrees. 0 is
// upright; positive values lean the grid to the right, like italics, and
// negative values lean it to the left.
const gridSlantRange = { min: -30, max: 30, step: 1 };

// The range of the Anchor Points slider in the Anchors folder. It moves in
// whole steps, since there is no half an anchor.
const anchorCountRange = { min: 3, max: 100, step: 1 };

// The range of each slider in the Splines folder. The sliders and the
// arrows on the folder both read them from here, so they always agree.
const splineRanges = {
  textureWeight: { min: 1, max: 20, step: 1 },
  shapeSize: { min: 0.1, max: 1, step: 0.01 },
  slant: { min: -45, max: 45, step: 1 },
  curvature: { min: -1, max: 1, step: 0.01 },
};

// Multiple view: the range of the Per Row slider. 2 shows 2 × 2 = 4
// iterations at once, 5 shows 5 × 5 = 25. More are smaller and draw slower.
const iterationsPerRowRange = { min: 2, max: 5, step: 1 };
// Multiple view: the gap between two iterations, in pixels of the grid.
const ITERATION_GAP = 16;
// Multiple view: the sliders each iteration picks its own value for,
// anywhere on the slider. Every iteration also joins the anchors in its own
// order. The grid, where the anchors sit, the spline style and the colors
// stay yours, so the iterations can be compared side by side.
const iterationRanges = { driftReach: driftReachRange, speed: speedRange };

// The arrows on the Colors folder: how different Main and Background must
// be at least, measured as a distance between the two colors (0 = the same,
// about 441 = black and white). Otherwise the drawing could vanish.
const MIN_COLOR_CONTRAST = 150;
// The highest value a color channel can have. Inverting a channel turns
// 0 into this and this into 0.
const MAX_CHANNEL = 255;
// The Gradient switch's options, and the range of its Angle slider, in
// degrees.
const gradientOptions = ['Off', 'Linear', 'Radial'];
const gradientAngleRange = { min: 0, max: 360, step: 1 };

// The values the control panel changes. The colors start at whatever you set
// in src/config.js, and are { r, g, b } objects with channels from 0 to 255.
const uiParams = {
  text: startingText,
  textSize: 500,       // the Size slider (150 to 900)

  columns: STARTING_COLUMNS,
  rows: STARTING_ROWS,
  gridSlant: 0,        // how far the grid leans, in degrees (positive = to the right)
  showGrid: true,
  showAnchors: true,

  anchorMode: 'Glyph', // 'Shape', 'Glyph' or 'Animation'; the sketch opens in this one
  viewMode: 'Single',  // 'Single' = one drawing, 'Multiple' = several iterations at once
  iterationsPerRow: 2, // Multiple: 2 = a 2 × 2 sheet of four iterations
  shapeSize: 1,        // the cell styles: how much of its cell a full shape covers
  slant: 30,           // Parallel Pen: how many degrees the rhomboids' sides lean
  anchorCount: 15,
  jitter: 0,           // fixed: 0 = anchor at the cell centre, 1 = anywhere in the cell
  closed: true,        // fixed: closed loop, or an open curve from first to last anchor

  texture: 'dots',
  textureWeight: 2,
  paintMode: 'Line',   // 'Line' = ink along the curve, 'Fill' = ink inside it
  speed: STARTING_SPEED, // drawing steps per frame, and how hard anchors shake
  driftReach: 2.625,   // how far anchors may wander (or swing, in Animation), in cells
  curvature: 0,        // -1 = sharp corners, 0 = the normal smooth curve, 1 = bends swing out further

  // fixed: these are not in the control panel
  pulseAmount: 0.6,    // Animation: how much anchors, shapes and lines grow and shrink (0 = not at all)
  loopLength: 4800,    // Animation: drawing steps until the motion repeats (4800 = about 53 s at speed 1.5)
  loopWobble: 1.5,     // Animation: how often anchors change direction during one loop
  pulseCycles: 4,      // Animation: how often everything grows and shrinks during one loop.
                       // Keep it a whole number, or the loop jumps when it starts over.
  textureSpread: 2.6,  // how far marks scatter across the line, in line widths
  dotOpacity: 0.02,    // ink per mark, shared by every texture
  textureOpacity: 1,   // multiplies dotOpacity; below 1 everything builds up more slowly
  dotsPerStep: 2000,

  foregroundColor,
  backgroundColor,
  accentColor,
  invertColors: false, // the Invert switch: true = Main and Background turned around, dark panels
  // Gradient, in the Colors folder: 'Off', 'Linear' or 'Radial'. When it
  // is on, the drawing runs from Main to Main 2 and the background from
  // Background to Background 2 (see gradientGeometry()).
  gradient: 'Off',
  gradientAngle: 90,   // Linear: the direction, in degrees: 0 = left to right, 90 = top to bottom
  foregroundEndColor,
  backgroundEndColor,
};

// A copy of every value as the sketch opens with it, for "Reset All". It is a
// real copy (structuredClone), so changing a color later doesn't change it.
const startingParams = structuredClone(uiParams);

// The three modes, in the order of the switch in the panel and the cards on
// the start screen.
const anchorModes = ['Glyph', 'Shape', 'Animation'];

// Animation mode starts with more anchors, for more movement.
const ANIMATION_ANCHOR_COUNT = 50;

// The names on the left are what the Style field shows; the ones on the
// right are what the code uses.
const textureOptions = {
  Fineliner: 'dots',
  'Parallel Pen': 'pen',
  Squares: 'squares',
  Circles: 'circles',
  Grain: 'grain',
  Chalk: 'chalk',
  Hair: 'hair',
  Fog: 'fog',
};

// These styles don't draw the curve itself: they fill the grid cells it
// passes through with one shape each. All the others are textures along it.
const cellStyles = ['squares', 'circles', 'pen'];

// Parallel Pen: the share of a rhomboid's width its lean may take at most,
// so even a steep slant leaves a sliver of shape instead of a line.
const MAX_LEAN = 0.9;

// Grain, Chalk and Hair are made of tiny specks. Their sizes in pixels, and
// how far apart Grain's two specks sit, as a share of the line's spread.
// Hair's specks are made bigger again by sparseTextures below.
const speckSizes = {
  chalkRadius: 0.5,
  hairRadius: 0.5,
  grainRadius: 0.7,
  grainSpread: 0.4,
};

// Hair and Fog draw fewer but bigger marks than the other textures: much
// less work for the computer, so they draw faster, and the texture shows
// more clearly. Each mark gets more ink to make up for the ones left out,
// so the line gets about as dark as before.
//   markShare  how many marks they draw, as a share of dotsPerStep
//              (0.25 = a quarter). Lower is faster, but blotchier at first.
//   sizeScale  how much bigger each mark is (2 = twice as wide): Hair's
//              strokes get thicker, Fog's blobs wider
const sparseTextures = {
  hair: { markShare: 0.25, sizeScale: 2 },
  fog: { markShare: 0.25, sizeScale: 1.5 },
};
// every other texture draws all its marks at their own size
const fullTexture = { markShare: 1, sizeScale: 1 };

// To find which way the curve runs at a point, the points this far before
// and after it are compared (in segments, 1 = from one anchor to the next).
const TANGENT_STEP = 0.01;

// Fill: to find what is inside the curve, it is traced as a chain of short
// straight pieces, this many per segment. More follow the curve closer but
// take longer.
const FILL_PIECES_PER_SEGMENT = 8;
// Fill: the chance that a pixel inside the curve gets a dot in one drawing
// step. Higher fills up faster; lower stays grainy for longer.
const FILL_DOT_CHANCE = 0.15;

// Animation mode: after this many drawing steps, old ink is half as strong
// as it was. 1500 steps is about 17 seconds at the starting speed. Smaller
// numbers make old lines vanish sooner and leave a shorter trail.
const FADE_HALF_LIFE = 1500;

// Shape and Glyph mode: anchors drift in two ways at once.
//   shake    a jitter in a new random direction every step. It mostly cancels
//            out, so it hardly moves the anchor, but it gives the line its grain.
//   wander   a steady walk along a heading that turns a little every step,
//            so the anchor really travels, up to the Drift slider's limit,
//            and bounces back from there.
// Both are multiplied by each anchor's own restlessness, a random number
// between RESTLESSNESS_MIN and RESTLESSNESS_MAX it gets when it is made. So
// some anchors move more than others, no matter where they are in the order.
// The minimum makes sure every anchor moves visibly.
const RESTLESSNESS_MIN = 5;
const RESTLESSNESS_MAX = 20;
// Base shake per step, in pixels.
const DRIFT_STEP = 0.005;
// Base wander per step, in pixels. At the starting speed an average anchor
// travels about 0.17 cells per second.
const WANDER_STEP = 0.006;
// How much the heading may turn per step, as an angle. Bigger values make
// winding paths, smaller ones straighter paths.
const WANDER_TURN = 0.08;
// Animation mode: each anchor reads its own part of the noise field. This is
// how far apart those parts are, so neighbouring anchors move differently.
const NOISE_SPACING = 10;
// Animation mode: the drawn squares, circles and rhomboids each pulse a
// little out of step with their neighbours. Cells close together are close
// in rhythm (small scale), and across the grid the rhythm shifts by up to
// this many full grow-and-shrink turns.
const CELL_PULSE_SCALE = 0.2;
const CELL_PULSE_TURNS = 3;

// How many ink pixels each pixel of the grid has, across and down, in Single
// view. At 3 the ink layer has 9 times the pixels (2400 × 2400 for an 800
// grid): lines and grain land more precisely, so the PNG and SVG exports
// and a Retina screen show finer detail, up to the High PNG size. Higher
// costs time every frame; 2 is lighter. Multiple view keeps 1: its
// iterations are small on screen, and there are many of them.
const INK_SCALE = 3;

// Every mode records a video of the drawing while it runs (see
// recordVideoFrame()), so a saved variation can be exported as MP4. It is this many pixels tall, and as wide as the
// grid's picture: square, or wider when the grid is slanted.
const VIDEO_HEIGHT = 1440;
// Exporting a video with its grid or anchors redraws every frame. This many
// are redrawn per frame of the sketch: more is faster, but the sketch
// stutters while it works.
const VIDEO_EXPORT_FRAMES_PER_DRAW = 6;

// 'Glyph' mode: the empty space kept around the text, as a share of the grid
// on each side.
const FONT_MARGIN = 0.1;

// The cell styles: how many solid lines' worth of ink a cell needs before
// its shape fills the whole cell. Higher = shapes grow more slowly.
const CELL_FULL_LINES = 8;
// SVG export of the curve styles: how many shades of ink are kept. More
// shades make a bigger file. Above 16 the difference no longer shows, while
// the file keeps growing.
const SVG_INK_LEVELS = 16;
// SVG export: positions are rounded to this many decimals; more would only
// make the file longer.
const SVG_DECIMALS = 2;
// SVG export of the curve styles: the outlines of the ink are rounded to
// this many decimals. A tenth of a pixel is finer than the eye sees, and
// the outlines have many points, so fewer decimals keep the file smaller.
const TRACE_DECIMALS = 1;

// How the guides look. Opacities run from 0 (invisible) to 255 (solid).
const guideStyle = {
  gridLineColor: { r: 128, g: 128, b: 128 },
  gridLineOpacity: 60,
  polygonOpacity: 90,    // the straight lines between the anchors
  cellShapeOpacity: 60,  // the see-through shapes on anchors in the cell styles
  anchorDotSize: 7,
  numberSize: 12,
  numberOffset: 6,       // how far the number sits up and right of its anchor
};
// The opacities above run to 255, as in p5; SVG files count them up to 1.
const SVG_FULL_OPACITY = 255;
// Full opacity, for the parts of the guides that are otherwise solid.
const SOLID = 255;

// How close (in pixels on screen) the mouse has to be to an anchor to grab
// it, and how far it has to move before a click counts as a drag.
const GRAB_RADIUS = 10;
const DRAG_THRESHOLD = 3;

// The grid shrinks when the window is too small for it (see fitView()).
// This much room, in pixels on screen, stays free above and below the grid
// for its labels, and on a narrow window this much more between the labels
// below the grid and the dock.
const STAGE_LABEL_ROOM = 26;
const DOCK_GAP = 6;
// The most pixels the canvas may have on a phone or tablet. iPhones and
// iPads don't draw a larger canvas at all (4096 × 4096). A small screen
// shows a large canvas shrunk, so there the canvas gets a little less sharp
// to stay below this. Computers draw far larger canvases, so they always
// get the full sharpness.
const MAX_TOUCH_CANVAS_PIXELS = 4096 * 4096;

// The anchors, in the order the spline visits them.
// Each one: { row, column, jx, jy, fx, fy, dx, dy, noise, heading, restlessness, phase }
//   jx, jy   random offset inside its cell, used when jitter > 0
//   fx, fy   a free position in pixels, set once you drag the anchor
//            (undefined while the anchor still sits in its cell)
//   dx, dy   how far it has drifted
//   noise    its current shake (Shape and Glyph mode)
//   heading  the direction it wanders in, as an angle (Shape and Glyph mode)
//   restlessness  how much it drifts compared to the others (Shape and Glyph mode)
//   phase    Animation mode: where in its grow-and-shrink rhythm it starts
// The short names are kept because the library saves anchors with them.
let anchors = [];
let selectedFont;
let animationPaused = false;
// Speed can be a fraction, like 0.5 for one step every other frame. The
// unused part of each frame's speed is saved here until it adds up to a step.
let stepsWaiting = 0;
// Animation mode: how many steps into the current loop we are.
let loopStep = 0;
// The noise field's seed. The library saves it with a variation, so an
// Animation loop comes back exactly as it was.
let currentNoiseSeed;
// The library asked to save the drawing. draw() does it at the next frame,
// before the grid and anchors are drawn on top, so the picture shows the
// drawing alone.
let saveWaiting = null;
// Counts up whenever the ink starts over or a variation is loaded. A loaded
// ink picture the browser is still unpacking checks it, so it doesn't land
// on a newer drawing. See pictureToInk().
let inkLoadNumber = 0;
// Multiple view: the iterations drawn at the same time. Each one is
// { ink, anchors, settings, noiseSeed, loopStep, stepsWaiting }: its own ink
// layer and anchors, its own Drift and Speed, and its own noise, place in
// the Animation loop and leftover speed. See buildIterations().
let iterations = [];
// Multiple view: an iteration was clicked to be saved. draw() does it at the
// next frame: { index, resolve }, or null.
let iterationSaveWaiting = null;
// The anchor being dragged: { anchor, startX, startY, moved }, or null.
let dragging = null;

// Shape and Animation each remember their own anchor count, so switching
// between them brings back the count you had there. `lastGridMode` is the
// one of the two used last.
let anchorCountPerMode = { Shape: uiParams.anchorCount, Animation: ANIMATION_ANCHOR_COUNT };
let lastGridMode = 'Shape';

// The ink layer: one number per ink pixel, 0 = empty, 1 = fully inked.
// It is square, with INK_SCALE ink pixels per grid pixel each way (1 in
// Multiple view). `inkImages` are the pictures it is turned into for the
// screen, one per layer size, with the colors they were last given (Main,
// or the gradient); see drawInk().
let ink;
const inkImages = new Map();

// The video of the drawing so far, see src/lib/video.js
const videoRecorder = createVideoRecorder({ height: VIDEO_HEIGHT });
// A video being exported with its guides, see exportVideo(); null otherwise
let videoExport = null;

// The control panel, the library of saved variations on the left, and the
// panel controls the code changes or hides after they are made.
let panel;
let library;
// The buttons in the title bar that fold the panels away, see
// src/lib/panels.js.
let panelButtons;
// The title bar across the top of the window, see createTopBar(), and how
// tall it is. The height is measured once: a hidden bar measures 0.
let topBar;
let topBarHeight = 0;
// The labels and corner marks around the grid, see createStageFrame().
let stageFrame;
// The start screen (see src/lib/start.js), and how much of it is left: 1
// while it is open, 0 once the main screen is there, and in between while
// one changes into the other. It moves the grid and fades the guides in.
let startScreen;
let startScreenAmount = 1;
// The change between the start screen and the main screen, while it runs:
// { from, to, startTime }, with startTime in p5's millis(). Otherwise null.
let startTransition = null;
// What the start screen shows of the guides. The grid never shows there;
// the anchors have a switch of their own on the start screen, which starts
// off, so the start screen shows the drawing alone. The eyes in the panel
// are separate.
const startGuides = { showGrid: false, showAnchors: false };
// Where the grid's left edge is on the start screen: in the middle of the
// start screen's left part. Measured while the start screen shows, see
// updateStartTransition().
let startGridLeft = 0;
// Restart, Play/Pause, Stop and the loop bar: one set in the control panel
// and one in the dock, kept the same (see createPlaybackControls()).
const playbackControls = [];
// The dock below the grid on narrow windows, see createDock().
let dock;
// How the grid is shown, see fitView(). `scale` is how big one pixel of
// the sketch is on screen: 1 when the grid fits at its real size, less
// when the window is too small. `gridTop` is where the grid starts, in the
// sketch's pixels. `libraryWidth` and `controlsWidth` are the panels'
// widths, as last measured.
const view = { scale: 1, gridTop: 0, libraryWidth: 0, controlsWidth: 0 };
let anchorModeController;
let glyphControllers = [];
let columnsController;
let rowsController;
let anchorCountController;
let randomAnchorsIcon;
let clearController;
let gridEye;
let anchorsEye;
let lineWidthController;
let shapeWidthController;
let paintModeController;
let gradientController;
let gradientAngleController;
let gradientColorControllers = [];
let viewModeController;
let iterationsPerRowController;
let textureController;
let slantController;
let invertSwitch;

window.setup = async function setup() {
  createCanvas(windowWidth, windowHeight);
  ink = newInkLayer(INK_SCALE);
  // the canvas's size and sharpness, and the grid's size and place
  fitView();
  // always the starting font from src/config.js: the panel has no font picker
  selectedFont = await applyFont(defaultFont);
  // the starting mode decides where the first anchors come from
  if (uiParams.anchorMode === 'Glyph') updateFontAnchors();
  else randomAnchors();
};

// How many drawing steps this frame gets, at the current speed. In Multiple
// view each iteration has its own speed, so it is asked once per iteration.
function stepsThisFrame() {
  if (animationPaused) return 0;
  stepsWaiting += uiParams.speed;
  const steps = Math.floor(stepsWaiting);
  stepsWaiting -= steps;
  return steps;
}

window.draw = function draw() {
  // a clicked iteration is saved first: it is drawn alone, full size, so
  // the saved picture looks like a drawing made in Single view. The frame
  // then starts over with the background below, so it never shows.
  if (iterationSaveWaiting) saveClickedIteration();
  // a video being exported gets its next frames, also out of sight
  if (videoExport) renderVideoExport();

  updateStartTransition();

  paintBackground();
  if (isMultipleView()) drawIterations();
  else drawSingle(stepsThisFrame());

  // the page around the canvas follows the grid and the drawing
  updateStageFrame();
  updatePlaybackProgress();

  // a hand cursor shows which anchors can be grabbed, or in Multiple view
  // which iteration a click saves
  if (!isOnMainScreen()) cursor('default');
  else if (dragging) cursor('grabbing');
  else if (anchorUnderMouse()) cursor('grab');
  else if (isMultipleView() && iterationUnderMouse() >= 0) cursor(HAND);
  else cursor('default');
};

// Single view: the one drawing in the middle, on the slanted grid.
function drawSingle(steps) {
  push();
  translate(gridLeft(), gridTop());
  slantGrid();
  advanceDrawing(steps);
  drawInkLayer();
  recordVideoFrame();
  if (saveWaiting) {
    saveWaiting();
    saveWaiting = null;
  }
  drawGuides();
  pop();
}

// Adds the drawing as it is right now to the video, without the guides:
// where the anchors are is kept with the frame instead, so the grid and the
// anchors can be switched on or off when the video is exported (see
// exportVideo()). The video starts over with the drawing (see
// restartDrawing()). While paused nothing is added, so the video skips the
// pause. On the start screen, and while it opens or closes, nothing is
// recorded: the video starts once the main screen is there.
function recordVideoFrame() {
  if (!isOnMainScreen() || startTransition) {
    videoRecorder.reset();
    return;
  }
  if (animationPaused) return;
  // how far each anchor has moved from its place, two numbers per anchor;
  // in Multiple view one list per iteration
  const anchorMoves = isMultipleView()
    ? iterations.map((iteration) => anchorMovesOf(iteration.anchors))
    : anchorMovesOf(anchors);
  // the same part of the canvas as the saved picture, see drawingPicture()
  const density = pixelDensity();
  const overhang = slantOverhang();
  videoRecorder.addFrame(
    drawingContext.canvas,
    (gridLeft() - overhang) * density, gridTop() * density,
    (gridSize + overhang * 2) * density, gridSize * density,
    anchorMoves,
  );
}

// dx and dy of every anchor, packed into one short list of numbers
function anchorMovesOf(anchorList) {
  const moves = new Float32Array(anchorList.length * 2);
  anchorList.forEach((anchor, index) => {
    moves[index * 2] = anchor.dx;
    moves[index * 2 + 1] = anchor.dy;
  });
  return moves;
}

// The saved anchors, moved the way `moves` says (see anchorMovesOf())
function anchorsMovedBy(savedAnchors, moves) {
  return savedAnchors.map((anchor, index) => ({
    ...anchor,
    dx: moves?.[index * 2] ?? anchor.dx,
    dy: moves?.[index * 2 + 1] ?? anchor.dy,
  }));
}

// The start screen fades out over START_TRANSITION_DURATION once a mode is
// picked, and back in when the project's name is clicked. Every frame, this
// works out how far that has come: slow at first, fast in the middle, slow
// at the end (cubicInOut).
function updateStartTransition() {
  // the start screen measures its width on screen; the grid is placed in
  // the sketch's pixels (see fitView())
  if (startScreenAmount > 0 || startTransition) startGridLeft = (startScreen.stageWidth() / view.scale - gridSize) / 2;
  if (!startTransition) return;
  const { from, to, startTime } = startTransition;
  const progress = constrain((millis() - startTime) / START_TRANSITION_DURATION, 0, 1);
  startScreenAmount = lerp(from, to, Easings.cubicInOut(progress));
  if (progress === 1) startTransition = null;
}

// Starts the change towards the start screen (`to` = 1) or the main screen
// (`to` = 0), from wherever it is now, so a change can also be turned back
// halfway.
function moveStartScreen(to) {
  startTransition = { from: startScreenAmount, to, startTime: millis() };
}

// How much a guide ('showGrid' or 'showAnchors') shows, from 0 to 1: on the
// main screen whether its eye in the panel is open, on the start screen
// whether its switch there is on, and a blend of the two while one changes
// into the other, so it fades in or out.
function guideVisibility(guide) {
  return lerp(Number(uiParams[guide]), Number(startGuides[guide]), startScreenAmount);
}

// The drawing only reacts to the mouse on the main screen. On the start
// screen, and while one changes into the other, it is only to look at.
function isOnMainScreen() {
  return startScreenAmount === 0;
}

// An opacity for a guide, from 0 to 255: `opacity` as far as the guide shows.
function guideOpacity(opacity, guide) {
  return opacity * guideVisibility(guide);
}

// The drawing moves on by `steps`: the anchors drift (or follow their loop
// in Animation) and the curve is dusted on.
function advanceDrawing(steps) {
  if (!hasEnoughAnchors()) return;
  for (let stepNumber = 0; stepNumber < steps; stepNumber++) {
    if (uiParams.anchorMode === 'Animation') loopAnchors();
    else driftAnchors();
    paintMarks(anchors.map(anchorPosition));
  }
  if (uiParams.anchorMode === 'Animation' && steps > 0) fadeInk(steps);
}

// Most styles show the ink as it is; the cell styles turn the ink in each
// cell into a shape.
function drawInkLayer() {
  if (!hasEnoughAnchors()) return;
  if (isCellStyle()) drawInkCells();
  else drawInk();
}

// The grid and the anchors, if they show. On the start screen its own
// switches decide, on the main screen the eyes in the panel.
function drawGuides() {
  if (guideVisibility('showGrid') > 0) drawGridLines();
  if (guideVisibility('showAnchors') > 0) drawAnchors();
}

function isMultipleView() {
  return uiParams.viewMode === 'Multiple';
}

// Multiple view: where iteration number `index` sits on the grid's square,
// counted in rows from the top left, and how much smaller than the grid it
// is drawn.
function iterationPlace(index) {
  const perRow = uiParams.iterationsPerRow;
  const size = (gridSize - ITERATION_GAP * (perRow - 1)) / perRow;
  const column = index % perRow;
  const row = Math.floor(index / perRow);
  return {
    x: column * (size + ITERATION_GAP),
    y: row * (size + ITERATION_GAP),
    size,
    scaleFactor: size / gridSize,
  };
}

// Moves and shrinks everything drawn after it into iteration `index`'s spot.
function placeIteration(index) {
  const { x, y, scaleFactor } = iterationPlace(index);
  translate(gridLeft() + x, gridTop() + y);
  scale(scaleFactor);
}

// Multiple view: every iteration in its spot. First all the drawings, then
// all the guides on top, so saving the whole sheet in between gets the
// drawings alone. The iteration under the mouse gets an outline.
function drawIterations() {
  iterations.forEach((iteration, index) => {
    withIteration(iteration, () => {
      push();
      placeIteration(index);
      slantGrid();
      advanceDrawing(stepsThisFrame());
      drawInkLayer();
      pop();
    });
  });

  // the drawings alone, like in Single view
  recordVideoFrame();
  if (saveWaiting) {
    saveWaiting();
    saveWaiting = null;
  }

  iterations.forEach((iteration, index) => {
    withIteration(iteration, () => {
      push();
      placeIteration(index);
      slantGrid();
      drawGuides();
      pop();
    });
  });

  // a click on it saves this one to the library
  const hovered = isOnMainScreen() ? iterationUnderMouse() : -1;
  if (hovered >= 0) {
    const { x, y, size } = iterationPlace(hovered);
    const { r, g, b } = uiParams.accentColor;
    push();
    translate(gridLeft(), gridTop());
    noFill();
    stroke(r, g, b);
    strokeWeight(2);
    rect(x, y, size, size);
    pop();
  }
}

// Multiple view: the number of the iteration under the mouse, or -1.
function iterationUnderMouse() {
  const x = mouseX - gridLeft();
  const y = mouseY - gridTop();
  return iterations.findIndex((iteration, index) => {
    const place = iterationPlace(index);
    return x >= place.x && x < place.x + place.size && y >= place.y && y < place.y + place.size;
  });
}

// Runs `action` with an iteration's drawing in place of the sketch's own:
// its ink, its anchors, its noise, place in the Animation loop and leftover
// speed, and its own Drift and Speed in place of yours. All the drawing code
// then works on the iteration without knowing it. Afterwards everything is
// swapped back.
function withIteration(iteration, action) {
  const own = { ink, anchors, loopStep, currentNoiseSeed, stepsWaiting };
  const yourValues = {};
  for (const [settingName, value] of Object.entries(iteration.settings)) {
    yourValues[settingName] = uiParams[settingName];
    uiParams[settingName] = value;
  }
  ink = iteration.ink;
  anchors = iteration.anchors;
  loopStep = iteration.loopStep;
  stepsWaiting = iteration.stepsWaiting;
  currentNoiseSeed = iteration.noiseSeed;
  noiseSeed(currentNoiseSeed);

  action();

  iteration.loopStep = loopStep;
  iteration.stepsWaiting = stepsWaiting;
  ink = own.ink;
  anchors = own.anchors;
  loopStep = own.loopStep;
  stepsWaiting = own.stepsWaiting;
  currentNoiseSeed = own.currentNoiseSeed;
  if (currentNoiseSeed !== undefined) noiseSeed(currentNoiseSeed);
  Object.assign(uiParams, yourValues);
}

// Multiple view: a fresh set of iterations, Per Row × Per Row of them. Each
// starts from your anchors on your grid, in your style and colors, with an
// empty ink layer. What it changes: the anchors are joined in a new order,
// Drift and Speed get random values (see iterationRanges), and every anchor
// gets a new heading, restlessness and rhythm, so it drifts its own way.
function buildIterations() {
  const count = uiParams.iterationsPerRow ** 2;
  iterations = Array.from({ length: count }, (unused, index) => {
    const ownAnchors = anchors.map((anchor) => ({
      ...anchor,
      heading: random(TWO_PI),
      restlessness: random(RESTLESSNESS_MIN, RESTLESSNESS_MAX),
      phase: random(TWO_PI),
    }));
    // p5's shuffle(); `true` shuffles the copy itself, yours stay in order
    shuffle(ownAnchors, true);
    return {
      ink: newInkLayer(1),
      anchors: ownAnchors,
      settings: Object.fromEntries(
        Object.entries(iterationRanges).map(([settingName, range]) => [settingName, randomSliderValue(range)]),
      ),
      noiseSeed: Date.now() + index,
      loopStep: 0,
      stepsWaiting: 0,
    };
  });
}

// A closed loop needs at least three anchors, an open curve two.
function hasEnoughAnchors() {
  return anchors.length >= (uiParams.closed ? 3 : 2);
}

function isCellStyle() {
  return cellStyles.includes(uiParams.texture);
}

function cellSize() {
  return { cellWidth: gridSize / uiParams.columns, cellHeight: gridSize / uiParams.rows };
}

function makeAnchor(row, column) {
  return {
    row, column,
    jx: random(-0.5, 0.5), jy: random(-0.5, 0.5),
    dx: 0, dy: 0, noise: 0, heading: random(TWO_PI),
    restlessness: random(RESTLESSNESS_MIN, RESTLESSNESS_MAX),
    phase: random(TWO_PI),
  };
}

// Where an anchor is right now, in pixels from the grid's top left corner.
function anchorPosition(anchor) {
  if (anchor.fx !== undefined) return [anchor.fx + anchor.dx, anchor.fy + anchor.dy];
  const { cellWidth, cellHeight } = cellSize();
  return [
    (anchor.column + 0.5 + anchor.jx * uiParams.jitter) * cellWidth + anchor.dx,
    (anchor.row + 0.5 + anchor.jy * uiParams.jitter) * cellHeight + anchor.dy,
  ];
}

function randomAnchors() {
  const cells = [];
  for (let row = 0; row < uiParams.rows; row++) {
    for (let column = 0; column < uiParams.columns; column++) cells.push([row, column]);
  }
  // p5's shuffle(); `true` shuffles the list itself instead of a copy
  shuffle(cells, true);
  const count = Math.min(uiParams.anchorCount, cells.length);
  // the shuffled cells are already in an arbitrary order, so we keep it
  anchors = cells.slice(0, count).map(([row, column]) => makeAnchor(row, column));
  // a new noise field, so Animation mode gets a new loop and not the same
  // motion on new cells. "Restart" keeps the field, so it replays the loop.
  currentNoiseSeed = Date.now();
  noiseSeed(currentNoiseSeed);
  restartDrawing();
}

// The Anchor Points slider: keeps the anchors you have and adds new ones on
// random empty cells, or removes the newest ones, until the count matches.
// Then the drawing starts over, so the old curve doesn't stay in the ink.
function changeAnchorCount() {
  while (anchors.length > uiParams.anchorCount) anchors.pop();
  const freeCells = [];
  for (let row = 0; row < uiParams.rows; row++) {
    for (let column = 0; column < uiParams.columns; column++) {
      const taken = anchors.some((anchor) => anchor.row === row && anchor.column === column);
      if (!taken) freeCells.push([row, column]);
    }
  }
  shuffle(freeCells, true);
  while (anchors.length < uiParams.anchorCount && freeCells.length > 0) {
    const [row, column] = freeCells.pop();
    anchors.push(makeAnchor(row, column));
  }
  restartDrawing();
}

function shuffleOrder() {
  shuffle(anchors, true);
  restartDrawing();
}

// The Clear button. In 'Shape' and 'Animation' it removes every anchor but
// stays in the current mode. In 'Glyph' it is called Restore: it builds the
// anchors again from the text in "Type here", undoing anchors you moved,
// added or removed by hand.
function clearGrid() {
  if (uiParams.anchorMode === 'Glyph') {
    updateFontAnchors();
    return;
  }
  anchors = [];
  restartDrawing();
}

// After columns or rows change. In 'Shape' and 'Animation' only the anchors
// that still fit are kept. In 'Glyph' every anchor stays: the text's anchors
// move to the middle of the cell their font spot now falls in, so the letters
// follow the new grid, and anchors you dragged onto a cell move into the grid
// if their cell is gone.
function resizeGrid() {
  if (uiParams.anchorMode !== 'Glyph') {
    anchors = anchors.filter((anchor) => anchor.row < uiParams.rows && anchor.column < uiParams.columns);
    restartDrawing();
    return;
  }
  const { cellWidth, cellHeight } = cellSize();
  for (const anchor of anchors) {
    const isFromFont = anchor.fontX !== undefined;
    const row = isFromFont ? Math.floor(anchor.fontY / cellHeight) : anchor.row;
    const column = isFromFont ? Math.floor(anchor.fontX / cellWidth) : anchor.column;
    anchor.row = constrain(row, 0, uiParams.rows - 1);
    anchor.column = constrain(column, 0, uiParams.columns - 1);
  }
  restartDrawing();
}

// Clears the ink and puts every anchor back in its cell.
// It also un-pauses: otherwise clearing or iterating while paused would leave
// an empty canvas with nothing being drawn onto it.
// In Multiple view the iterations start over too, as a fresh set built
// from the anchors and settings as they are now.
function restartDrawing() {
  setPaused(false);
  // the video starts over with the drawing
  videoRecorder.reset();
  inkLoadNumber += 1;
  if (ink) ink.fill(0);
  loopStep = 0;
  for (const anchor of anchors) {
    anchor.dx = 0;
    anchor.dy = 0;
    anchor.noise = 0;
  }
  if (isMultipleView()) buildIterations();
}

// 'Glyph' mode: the text's anchor points replace all other anchors.
function updateFontAnchors() {
  if (!selectedFont || uiParams.anchorMode !== 'Glyph') return;
  anchors = textAnchors();
  restartDrawing();
}

// Reads the anchor points of the text from the font file (the points the
// type designer placed, as in Illustrator) and turns them into grid anchors,
// scaled to fit in the middle of the grid.
function textAnchors() {
  // textToCurves reads the outlines at the current textSize(), so it is set
  // here; push() and pop() keep that from changing the rest of the drawing
  push();
  textSize(uiParams.textSize);
  const letters = textToCurves(selectedFont, uiParams.text, 0, 0);
  pop();

  // every curve starts on an anchor. Its end is the next curve's start, so
  // taking only the starts gives each anchor once, in outline order.
  const points = [];
  for (const contour of letters.flat()) {
    for (const curve of contour) points.push(curve.from);
  }
  if (points.length === 0) return [];

  const xValues = points.map((fontPoint) => fontPoint.x);
  const yValues = points.map((fontPoint) => fontPoint.y);
  const minX = Math.min(...xValues);
  const minY = Math.min(...yValues);
  const pointsWidth = Math.max(...xValues) - minX;
  const pointsHeight = Math.max(...yValues) - minY;

  // shrink the text until it fits inside the margin, but never enlarge it
  const availableSize = gridSize * (1 - FONT_MARGIN * 2);
  const fitScale = Math.min(
    1,
    pointsWidth > 0 ? availableSize / pointsWidth : 1,
    pointsHeight > 0 ? availableSize / pointsHeight : 1,
  );
  const offsetX = (gridSize - pointsWidth * fitScale) / 2;
  const offsetY = (gridSize - pointsHeight * fitScale) / 2;
  const { cellWidth, cellHeight } = cellSize();

  return points.map((fontPoint) => {
    const x = offsetX + (fontPoint.x - minX) * fitScale;
    const y = offsetY + (fontPoint.y - minY) * fitScale;
    const row = Math.min(uiParams.rows - 1, Math.floor(y / cellHeight));
    const column = Math.min(uiParams.columns - 1, Math.floor(x / cellWidth));
    // it sits in the middle of the cell the font's point falls in, like
    // the anchors in 'Shape'. fontX and fontY remember the exact spot, so
    // it can find its cell again when the grid changes.
    return { ...makeAnchor(row, column), jx: 0, jy: 0, fontX: x, fontY: y };
  });
}

// Stores the anchor count of the mode being left and brings back the one of
// `mode`. Glyph mode has no count of its own, so it is skipped.
function swapAnchorCount(mode) {
  if (mode === 'Glyph' || mode === lastGridMode) return;
  anchorCountPerMode[lastGridMode] = uiParams.anchorCount;
  uiParams.anchorCount = anchorCountPerMode[mode];
  lastGridMode = mode;
  if (anchorCountController) anchorCountController.updateDisplay();
}

// Shape and Glyph mode: shake and wander (see DRIFT_STEP above).
// Speed changes how far each shake moves, not only how many steps run, so a
// higher speed makes the anchors visibly jitter more.
function driftAnchors() {
  const shakeSize = DRIFT_STEP * (uiParams.speed / NORMAL_SPEED);
  anchors.forEach((anchor) => {
    // shake: the shake's size takes a small random walk, and the anchor
    // moves that far in a random direction
    anchor.noise += random(-1, 1) * anchor.restlessness * shakeSize;
    const angle = random(TWO_PI);
    anchor.dx += Math.cos(angle) * anchor.noise;
    anchor.dy += Math.sin(angle) * anchor.noise;

    // wander: turn the heading a little, then take a step along it
    anchor.heading += random(-WANDER_TURN, WANDER_TURN);
    const wanderSize = anchor.restlessness * WANDER_STEP;
    anchor.dx += Math.cos(anchor.heading) * wanderSize;
    anchor.dy += Math.sin(anchor.heading) * wanderSize;

    // at the edge of the Drift limit (or the grid) the heading bounces off
    // like a ball off a wall, instead of pushing against it
    const [beforeX, beforeY] = [anchor.dx, anchor.dy];
    keepNearHome(anchor, uiParams.driftReach);
    if (anchor.dx !== beforeX) anchor.heading = PI - anchor.heading;
    if (anchor.dy !== beforeY) anchor.heading = -anchor.heading;
  });
}

// Animation mode: instead of a random walk, each anchor follows a path that
// closes on itself. The trick: the anchor reads p5's noise() while walking
// around a circle. A circle ends where it begins, so after `loopLength` steps
// every anchor is back at its start and the motion repeats without a jump.
function loopAnchors() {
  loopStep = (loopStep + 1) % uiParams.loopLength;
  placeAnchorsOnLoop();
}

// Puts every anchor where its path is at the current loopStep. The path
// only depends on loopStep, so this also works for a jump to any moment.
function placeAnchorsOnLoop() {
  const angle = loopAngle();
  // a bigger circle crosses more of the noise field, so more changes of direction
  const circleX = Math.cos(angle) * uiParams.loopWobble;
  const circleY = Math.sin(angle) * uiParams.loopWobble;
  const { cellWidth, cellHeight } = cellSize();
  anchors.forEach((anchor, index) => {
    // two different parts of the noise field: one for x, one for y
    const noiseX = noise(index * NOISE_SPACING, circleX, circleY);
    const noiseY = noise(index * NOISE_SPACING + NOISE_SPACING / 2, circleX, circleY);
    // the Drift slider sets how far they swing, in cells
    anchor.dx = map(noiseX, 0, 1, -cellWidth, cellWidth) * uiParams.driftReach;
    anchor.dy = map(noiseY, 0, 1, -cellHeight, cellHeight) * uiParams.driftReach;
    keepNearHome(anchor, uiParams.driftReach);
  });
}

// The Playback bar, dragged: jumps to `share` of the way through the
// Animation loop (0 = its start, 1 = its end). The anchors jump there right
// away, also while paused. The ink already drawn stays. In Multiple view
// every iteration jumps to the same moment of its own loop.
function seekLoop(share) {
  if (uiParams.anchorMode !== 'Animation') return;
  // the last step of a loop is loopLength - 1; loopLength is its start again
  const step = constrain(round(share * uiParams.loopLength), 0, uiParams.loopLength - 1);
  const jump = () => {
    loopStep = step;
    placeAnchorsOnLoop();
  };
  if (isMultipleView()) iterations.forEach((iteration) => withIteration(iteration, jump));
  else jump();
}

// An anchor may drift at most `reach` cells away from its spot (its cell, or
// where you dropped it) in any direction, and never off the grid.
function keepNearHome(anchor, reach) {
  const { cellWidth, cellHeight } = cellSize();
  anchor.dx = constrain(anchor.dx, -reach * cellWidth, reach * cellWidth);
  anchor.dy = constrain(anchor.dy, -reach * cellHeight, reach * cellHeight);
  // move the drift back by however far the anchor went past the grid's edge
  const [x, y] = anchorPosition(anchor);
  anchor.dx += constrain(x, 0, gridSize) - x;
  anchor.dy += constrain(y, 0, gridSize) - y;
}

// How far through the current loop we are, as an angle: 0 at the start,
// TWO_PI (a full turn) at the end, which is the same as the start again.
function loopAngle() {
  return map(loopStep, 0, uiParams.loopLength, 0, TWO_PI);
}

// Animation mode: a size factor that grows and shrinks around 1, for example
// between 0.4 and 1.6 when `pulseAmount` is 0.6. It swings `pulseCycles` times per
// loop, a whole number, so it is back at its start when the loop repeats.
// `phase` shifts the rhythm, so not everything is big at the same moment.
// In the other modes nothing pulses, so it stays 1.
function pulse(phase) {
  if (uiParams.anchorMode !== 'Animation') return 1;
  return 1 + uiParams.pulseAmount * Math.sin(loopAngle() * uiParams.pulseCycles + phase);
}

// The pulse of a drawn square, circle or rhomboid. Cells have no phase of
// their own, so it is read from the noise field at the cell's place.
function cellPulse(row, column) {
  const turns = noise(column * CELL_PULSE_SCALE, row * CELL_PULSE_SCALE) * CELL_PULSE_TURNS;
  return pulse(turns * TWO_PI);
}

// An empty ink layer with `scale` ink pixels per grid pixel each way.
function newInkLayer(scale) {
  return new Float32Array((gridSize * scale) ** 2);
}

// How many ink pixels wide an ink layer is. Layers are square.
function layerSize(layer) {
  return round(sqrt(layer.length));
}

// How many ink pixels the current ink layer has per grid pixel, each way:
// INK_SCALE for the drawing in Single view, 1 for an iteration.
function inkScale() {
  return layerSize(ink) / gridSize;
}

// Animation mode: every bit of ink loses a little strength each step, so old
// lines slowly disappear while new ones are drawn. The whole frame's fading
// is done at once: halving every FADE_HALF_LIFE steps.
function fadeInk(steps) {
  const keep = 0.5 ** (steps / FADE_HALF_LIFE);
  for (let index = 0; index < ink.length; index++) ink[index] *= keep;
}

// The curve is a uniform cubic B-spline. It passes near the anchors, not
// through them; that softness is the point.
// Closed: the curve loops through all anchors and back to the first.
// Open:   the first and last anchors are repeated three times ("clamped"),
//         so the curve starts exactly on the first and ends on the last.
// A position on the curve is a number u from 0 to segmentCount(): the whole
// part says which segment, the rest how far along it.

function segmentCount(anchorCount) {
  return uiParams.closed ? anchorCount : anchorCount + 1;
}

// Which of the anchors the spline uses as its j-th point. Closed curves
// wrap around to the first anchor; open curves repeat their two end anchors.
function splineIndex(anchorCount, j) {
  if (uiParams.closed) return ((j % anchorCount) + anchorCount) % anchorCount;
  return constrain(j - 2, 0, anchorCount - 1);
}

// The segment that position u lies on.
function segmentAt(anchorCount, u) {
  return Math.min(Math.floor(u), segmentCount(anchorCount) - 1);
}

// The two anchors the curve runs between at u, and how far it is from the
// first to the second (0 to 1). Used to blend their sizes along the line.
function anchorsAround(anchorCount, u) {
  const segment = segmentAt(anchorCount, u);
  const start = uiParams.closed ? segment : segment + 1;
  return {
    from: splineIndex(anchorCount, start),
    to: splineIndex(anchorCount, start + 1),
    amount: u - segment,
  };
}

// Animation mode: the line's width at u grows and shrinks with the two
// anchors around it, blended smoothly from one to the other.
function pulseAlongCurve(pulses, u) {
  const { from, to, amount } = anchorsAround(pulses.length, u);
  return lerp(pulses[from], pulses[to], amount);
}

// The point on the curve at u, as [x, y].
function pointOnSpline(points, u) {
  const anchorCount = points.length;
  const segment = segmentAt(anchorCount, u);
  const along = u - segment;

  // each segment is shaped by four points in a row; a closed curve starts one earlier
  const first = uiParams.closed ? segment - 1 : segment;
  const point0 = points[splineIndex(anchorCount, first)];
  const point1 = points[splineIndex(anchorCount, first + 1)];
  const point2 = points[splineIndex(anchorCount, first + 2)];
  const point3 = points[splineIndex(anchorCount, first + 3)];

  // how much each of the four points pulls on the curve here (they add up to 1)
  const alongSquared = along * along;
  const alongCubed = alongSquared * along;
  const rest = 1 - along;
  const weight0 = (rest * rest * rest) / 6;
  const weight1 = (3 * alongCubed - 6 * alongSquared + 4) / 6;
  const weight2 = (-3 * alongCubed + 3 * alongSquared + 3 * along + 1) / 6;
  const weight3 = alongCubed / 6;

  const smoothX = weight0 * point0[0] + weight1 * point1[0] + weight2 * point2[0] + weight3 * point3[0];
  const smoothY = weight0 * point0[1] + weight1 * point1[1] + weight2 * point2[1] + weight3 * point3[1];

  // "curvature" below 0: the same spot on the straight line between the two
  // anchors this part of the curve runs between. Mixing toward it pulls the
  // bends into corners; at -1 it is the straight line itself. (Above 0 is
  // handled by exaggerateBends() before the curve is worked out.)
  const straightX = lerp(point1[0], point2[0], along);
  const straightY = lerp(point1[1], point2[1], along);
  const sharpness = Math.max(0, -uiParams.curvature);
  return [lerp(smoothX, straightX, sharpness), lerp(smoothY, straightY, sharpness)];
}

// "curvature" above 0: each anchor is pushed away from the point halfway
// between its two neighbours, by curvature times that distance. Every bend
// swings out further and the curve gets rounder, but stays smooth, because
// the curve is still worked out the same way, just from the pushed points.
function exaggerateBends(points) {
  if (uiParams.curvature <= 0) return points;
  const count = points.length;
  return points.map((anchorPoint, index) => {
    // an open curve's two ends have only one neighbour, so they stay put
    if (!uiParams.closed && (index === 0 || index === count - 1)) return anchorPoint;
    const before = points[(index - 1 + count) % count];
    const after = points[(index + 1) % count];
    const halfwayX = (before[0] + after[0]) / 2;
    const halfwayY = (before[1] + after[1]) / 2;
    return [
      anchorPoint[0] + (anchorPoint[0] - halfwayX) * uiParams.curvature,
      anchorPoint[1] + (anchorPoint[1] - halfwayY) * uiParams.curvature,
    ];
  });
}

// One drawing step: adds marks along the curve to the ink layer, or inside
// it, depending on the Line | Fill switch.
function paintMarks(anchorPoints) {
  const points = exaggerateBends(anchorPoints);
  const segments = segmentCount(points.length);
  if (uiParams.paintMode === 'Fill') {
    fillInside(points, segments);
    return;
  }
  // every texture uses the same ink as the dots, so they all build up slowly
  // over time instead of turning into a solid stroke in the first frame
  const opacity = uiParams.dotOpacity;
  // each anchor's size right now (always 1 outside Animation mode)
  const pulses = anchors.map((anchor) => pulse(anchor.phase));

  // the cell styles are sized by the curve's ink, painted as dots
  if (uiParams.texture === 'dots' || isCellStyle()) {
    // Dots grow with "width": at 1 and 2 they are single pixels, and every
    // step above that makes them a pixel wider. The cell styles use their
    // width for the shapes, so their dots stay single pixels.
    for (let mark = 0; mark < uiParams.dotsPerStep; mark++) {
      const u = random(segments);
      const [x, y] = pointOnSpline(points, u);
      const dotWidth = uiParams.textureWeight * pulseAlongCurve(pulses, u);
      const radius = isCellStyle() ? 0 : Math.max(0, (dotWidth - 1) / 2);
      addInk(x, y, radius, opacity);
    }
    return;
  }

  // Fog's blobs are as wide as the line, so each one inks many pixels. The
  // wider the line, the fewer blobs Fog draws, each with that much more ink:
  // it gets just as dark, for a fraction of the work. It only looks a little
  // blotchier in the first moments, before the blobs overlap.
  const fogThinning = uiParams.texture === 'fog' ? uiParams.textureWeight : 1;
  // Hair and Fog: fewer, bigger marks (see sparseTextures)
  const sparse = sparseTextures[uiParams.texture] ?? fullTexture;
  const markCount = (uiParams.dotsPerStep * sparse.markShare) / fogThinning;
  // the ink of the marks left out goes into the ones that are drawn. Bigger
  // marks spread their ink wider, so they get a share more for that, too.
  const markOpacity = (opacity * fogThinning) / (sparse.markShare * sparse.sizeScale);

  for (let mark = 0; mark < markCount; mark++) {
    const u = random(segments);
    const [x, y] = pointOnSpline(points, u);
    // the direction the curve runs here, and the one straight across it
    const [beforeX, beforeY] = pointOnSpline(points, Math.max(0, u - TANGENT_STEP));
    const [afterX, afterY] = pointOnSpline(points, Math.min(segments, u + TANGENT_STEP));
    const tangentLength = Math.max(1, dist(beforeX, beforeY, afterX, afterY));
    const acrossX = -(afterY - beforeY) / tangentLength;
    const acrossY = (afterX - beforeX) / tangentLength;
    const size = uiParams.textureWeight * pulseAlongCurve(pulses, u);
    const offset = random(-size, size) * uiParams.textureSpread;

    switch (uiParams.texture) {
      // tiny specks scattered across the line
      case 'chalk':
        addInk(x + acrossX * offset, y + acrossY * offset, speckSizes.chalkRadius, markOpacity);
        break;
      // thin strokes straight across the line, like hairs
      case 'hair':
        addInkStroke(
          x + acrossX * offset, y + acrossY * offset,
          x - acrossX * offset, y - acrossY * offset,
          speckSizes.hairRadius * sparse.sizeScale, markOpacity,
        );
        break;
      // soft blobs scattered across the line
      case 'fog':
        addInk(x + acrossX * offset, y + acrossY * offset, size * sparse.sizeScale, markOpacity);
        break;
      // pairs of small specks on both sides of the line
      case 'grain': {
        const spread = offset * speckSizes.grainSpread;
        addInk(x + acrossX * spread, y + acrossY * spread, speckSizes.grainRadius, markOpacity);
        addInk(x - acrossX * spread, y - acrossY * spread, speckSizes.grainRadius, markOpacity);
        break;
      }
    }
  }
}

// Fill: dusts dots on the pixels inside the curve, a few each step, so the
// inside builds up slowly like the line does.
// The curve is traced as straight pieces. Then, row by row, every place
// where a piece crosses the row is found. Going left to right, each crossing
// switches between outside and inside (like Illustrator's "even-odd" fill),
// so where the curve crosses itself, or around the hole in an "O", the fill
// switches off again.
function fillInside(points, segments) {
  const pieceCount = segments * FILL_PIECES_PER_SEGMENT;
  // the rows and columns here are the ink layer's, so the corners are
  // measured in ink pixels
  const scale = inkScale();
  const size = layerSize(ink);
  const corners = [];
  for (let piece = 0; piece < pieceCount; piece++) {
    const [x, y] = pointOnSpline(points, piece / FILL_PIECES_PER_SEGMENT);
    corners.push([x * scale, y * scale]);
  }

  // only the rows the curve reaches, and never outside the grid
  const yValues = corners.map(([, y]) => y);
  const topRow = Math.max(0, Math.floor(Math.min(...yValues)));
  const bottomRow = Math.min(size - 1, Math.ceil(Math.max(...yValues)));
  const crossingsPerRow = Array.from({ length: bottomRow - topRow + 1 }, () => []);

  // every piece, from each corner to the next; the last one closes the loop
  corners.forEach(([startX, startY], index) => {
    const [endX, endY] = corners[(index + 1) % corners.length];
    if (startY === endY) return;
    // the rows whose middle line (y + 0.5) this piece crosses
    const firstRow = Math.max(topRow, Math.ceil(Math.min(startY, endY) - 0.5));
    const lastRow = Math.min(bottomRow, Math.ceil(Math.max(startY, endY) - 0.5) - 1);
    for (let row = firstRow; row <= lastRow; row++) {
      const amount = (row + 0.5 - startY) / (endY - startY);
      crossingsPerRow[row - topRow].push(lerp(startX, endX, amount));
    }
  });

  const opacity = uiParams.dotOpacity * uiParams.textureOpacity;
  crossingsPerRow.forEach((crossings, index) => {
    const row = topRow + index;
    crossings.sort((left, right) => left - right);
    // the crossings come in pairs: in at the first, out at the second
    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const startColumn = Math.max(0, Math.ceil(crossings[pair] - 0.5));
      const endColumn = Math.min(size - 1, Math.floor(crossings[pair + 1] - 0.5));
      for (let column = startColumn; column <= endColumn; column++) {
        if (random() < FILL_DOT_CHANCE) addInkToPixel(column, row, opacity, size);
      }
    }
  });
}

// A mark spreads its ink over its width, so wide marks are not darker than
// thin ones.
// `x`, `y` and `radius` are in grid pixels. The ink layer may have finer
// pixels (see INK_SCALE): the mark then covers the same part of the grid,
// with the same ink in each pixel, only its edge is finer. So the drawing
// looks the same, just sharper.
function addInk(x, y, radius, opacity) {
  const markWidth = Math.max(1, radius * 2);
  const markOpacity = (opacity * uiParams.textureOpacity) / markWidth;
  const scale = inkScale();
  const size = layerSize(ink);

  // A mark less than a grid pixel wide covers one grid pixel's worth of ink
  // pixels: a small square of them, centred on the mark. Chalk and Grain
  // are made of these.
  if (radius < 1) {
    const left = Math.round(x * scale - scale / 2);
    const top = Math.round(y * scale - scale / 2);
    for (let offsetY = 0; offsetY < scale; offsetY++) {
      for (let offsetX = 0; offsetX < scale; offsetX++) {
        addInkToPixel(left + offsetX, top + offsetY, markOpacity, size);
      }
    }
    return;
  }

  // Row by row, only the pixels inside the circle are visited: halfWidth is
  // how far the circle reaches left and right on that row. This is much
  // faster for wide marks like Fog than checking every pixel of the square.
  const centerX = Math.floor(x * scale);
  const centerY = Math.floor(y * scale);
  const inkRadius = radius * scale;
  const reach = Math.ceil(inkRadius);
  for (let offsetY = -reach; offsetY <= reach; offsetY++) {
    // rows above or below the circle are skipped
    if (Math.abs(offsetY) > inkRadius) continue;
    const halfWidth = Math.floor(Math.sqrt(inkRadius * inkRadius - offsetY * offsetY));
    for (let offsetX = -halfWidth; offsetX <= halfWidth; offsetX++) {
      addInkToPixel(centerX + offsetX, centerY + offsetY, markOpacity, size);
    }
  }
}

// Adds ink to one ink pixel, unless it lies outside the layer, which is
// `size` ink pixels wide.
function addInkToPixel(pixelX, pixelY, markOpacity, size) {
  if (pixelX < 0 || pixelY < 0 || pixelX >= size || pixelY >= size) return;
  const index = pixelY * size + pixelX;
  ink[index] += (1 - ink[index]) * markOpacity;
}

// A short stroke made of small marks. Its ink is shared between them, so a
// stroke counts as one mark, not as many.
function addInkStroke(startX, startY, endX, endY, radius, opacity) {
  const samples = Math.max(1, Math.ceil(dist(startX, startY, endX, endY)));
  for (let sample = 0; sample <= samples; sample++) {
    const amount = sample / samples;
    addInk(lerp(startX, endX, amount), lerp(startY, endY, amount), radius, opacity / (samples + 1));
  }
}

// Turns the ink layer into an image in the Main color (or the gradient from
// Main to Main 2), transparent where there is no ink, so color changes in
// the panel apply right away.
function drawInk() {
  // One picture per layer size, made the first time it is needed. Its
  // pixels are read once (loadPixels), after that only written to.
  const size = layerSize(ink);
  if (!inkImages.has(size)) {
    const picture = createImage(size, size);
    picture.loadPixels();
    inkImages.set(size, { picture, colorKey: '' });
  }
  const screenImage = inkImages.get(size);
  // every pixel takes four places in the list: red, green, blue, opacity
  const pixelValues = screenImage.picture.pixels;
  // red, green and blue only change with the colors and the gradient, so
  // they are only written then; the opacity follows the ink every frame
  const colorKey = JSON.stringify([uiParams.foregroundColor, uiParams.foregroundEndColor, gradientGeometry()]);
  if (screenImage.colorKey !== colorKey) {
    screenImage.colorKey = colorKey;
    paintInkColors(pixelValues, size);
  }
  for (let index = 0; index < ink.length; index++) {
    pixelValues[index * 4 + 3] = ink[index] * SOLID;
  }
  screenImage.picture.updatePixels();
  // shown as big as the grid, whatever its number of pixels
  image(screenImage.picture, 0, 0, gridSize, gridSize);
}

// Gives every pixel of the ink's picture its color: Main everywhere, or
// with a gradient the color of its spot between Main and Main 2. `size` is
// how many pixels wide the picture is; each pixel is measured at its
// middle, in the grid's pixels.
function paintInkColors(pixelValues, size) {
  const geometry = gradientGeometry();
  const startColor = uiParams.foregroundColor;
  const endColor = uiParams.foregroundEndColor;
  const pixelSize = gridSize / size;
  for (let pixelY = 0; pixelY < size; pixelY++) {
    for (let pixelX = 0; pixelX < size; pixelX++) {
      const share = geometry
        ? gradientShare((pixelX + 0.5) * pixelSize, (pixelY + 0.5) * pixelSize, geometry)
        : 0;
      const place = (pixelY * size + pixelX) * 4;
      pixelValues[place] = startColor.r + (endColor.r - startColor.r) * share;
      pixelValues[place + 1] = startColor.g + (endColor.g - startColor.g) * share;
      pixelValues[place + 2] = startColor.b + (endColor.b - startColor.b) * share;
    }
  }
}

// The cell styles: the ink is counted per grid cell, and each cell gets a
// solid shape that grows with the ink in it. An empty cell shows nothing; a
// cell with CELL_FULL_LINES lines' worth of ink is filled.
// Returns one { centerX, centerY, shapeWidth, shapeHeight } per shape, so the screen
// and the SVG export draw exactly the same thing.
function inkCells() {
  const { cellWidth, cellHeight } = cellSize();
  const inkPerCell = new Float32Array(uiParams.rows * uiParams.columns);
  const scale = inkScale();
  const size = layerSize(ink);
  for (let pixelY = 0; pixelY < size; pixelY++) {
    const row = Math.min(uiParams.rows - 1, Math.floor(pixelY / scale / cellHeight));
    for (let pixelX = 0; pixelX < size; pixelX++) {
      const value = ink[pixelY * size + pixelX];
      if (value === 0) continue;
      const column = Math.min(uiParams.columns - 1, Math.floor(pixelX / scale / cellWidth));
      inkPerCell[row * uiParams.columns + column] += value;
    }
  }

  // a solid line straight across a cell holds about one cell width of ink,
  // in grid pixels' worth: a finer layer has scale × scale ink pixels in
  // every grid pixel, so it holds that many times as much
  const fullCell = CELL_FULL_LINES * Math.min(cellWidth, cellHeight) * scale * scale;
  const shapes = [];
  for (let row = 0; row < uiParams.rows; row++) {
    for (let column = 0; column < uiParams.columns; column++) {
      const amount = Math.min(1, inkPerCell[row * uiParams.columns + column] / fullCell);
      if (amount === 0) continue;
      // in Animation mode each shape also grows and shrinks, but never
      // past its cell, so it doesn't run into its neighbours
      const size = Math.min(1, amount * uiParams.shapeSize * cellPulse(row, column));
      shapes.push({
        centerX: (column + 0.5) * cellWidth,
        centerY: (row + 0.5) * cellHeight,
        shapeWidth: cellWidth * size,
        shapeHeight: cellHeight * size,
      });
    }
  }
  return shapes;
}

// Each shape in the color of the spot it sits on (Main, unless there is a
// gradient)
function drawInkCells() {
  noStroke();
  for (const { centerX, centerY, shapeWidth, shapeHeight } of inkCells()) {
    const { r, g, b } = inkColorAt(centerX, centerY);
    fill(r, g, b);
    drawCellShape(centerX, centerY, shapeWidth, shapeHeight);
  }
}

// The cell styles draw one shape per cell: a square, a circle, or for
// Parallel Pen a rhomboid. Used for the drawing and the anchor markers.
function drawCellShape(centerX, centerY, shapeWidth, shapeHeight) {
  if (uiParams.texture === 'squares') {
    rect(centerX - shapeWidth / 2, centerY - shapeHeight / 2, shapeWidth, shapeHeight);
  } else if (uiParams.texture === 'circles') {
    ellipse(centerX, centerY, shapeWidth, shapeHeight);
  } else {
    beginShape();
    for (const [x, y] of rhomboidCorners(centerX, centerY, shapeWidth, shapeHeight)) vertex(x, y);
    endShape(CLOSE);
  }
}

// Parallel Pen: the four corners of a rhomboid in a shapeWidth x shapeHeight box around
// centerX, centerY. Top and bottom stay level; the sides lean by "Slant"
// degrees, like the flat nib of a parallel pen held at an angle (positive
// leans right, like italics). The lean takes its room from the width, so
// the shape always stays inside its cell.
function rhomboidCorners(centerX, centerY, shapeWidth, shapeHeight) {
  const lean = constrain(shapeHeight * Math.tan(radians(uiParams.slant)), -shapeWidth * MAX_LEAN, shapeWidth * MAX_LEAN);
  const left = centerX - shapeWidth / 2;
  const right = centerX + shapeWidth / 2;
  const top = centerY - shapeHeight / 2;
  const bottom = centerY + shapeHeight / 2;
  return [
    [left + Math.max(0, lean), top],
    [right + Math.min(0, lean), top],
    [right - Math.max(0, lean), bottom],
    [left - Math.min(0, lean), bottom],
  ];
}

// SVG wants colors as text, like rgb(250, 250, 250).
function svgColor({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

// THE GRADIENTS. Where the gradient runs, in the grid's pixels, or null
// while Gradient is Off. The screen and the SVG files both use this, so
// they always agree.
//   Linear  a straight line through the middle of the grid, in the
//           direction of Angle, just long enough to reach the grid's
//           corners: { type, x1, y1, x2, y2 }
//   Radial  from the middle of the grid out to its corners: { type, cx, cy, r }
function gradientGeometry() {
  const middle = gridSize / 2;
  if (uiParams.gradient === 'Linear') {
    const angle = radians(uiParams.gradientAngle);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const halfLength = (Math.abs(directionX) + Math.abs(directionY)) * middle;
    return {
      type: 'Linear',
      x1: middle - directionX * halfLength,
      y1: middle - directionY * halfLength,
      x2: middle + directionX * halfLength,
      y2: middle + directionY * halfLength,
    };
  }
  if (uiParams.gradient === 'Radial') return { type: 'Radial', cx: middle, cy: middle, r: middle * Math.SQRT2 };
  return null;
}

// How far along the gradient the point x, y lies: 0 at its start, 1 at its
// end, and the same past either end. This runs for every ink pixel when the
// colors change, so it uses JavaScript's own Math functions, which are much
// faster than p5's in such a long loop (see src/lib/trace.js).
function gradientShare(x, y, geometry) {
  if (geometry.type === 'Radial') {
    const offsetX = x - geometry.cx;
    const offsetY = y - geometry.cy;
    return Math.min(1, Math.sqrt(offsetX * offsetX + offsetY * offsetY) / geometry.r);
  }
  const lengthX = geometry.x2 - geometry.x1;
  const lengthY = geometry.y2 - geometry.y1;
  const share = ((x - geometry.x1) * lengthX + (y - geometry.y1) * lengthY) / (lengthX * lengthX + lengthY * lengthY);
  return Math.min(1, Math.max(0, share));
}

// The color `share` of the way from startColor to endColor
function mixColors(startColor, endColor, share) {
  return {
    r: Math.round(startColor.r + (endColor.r - startColor.r) * share),
    g: Math.round(startColor.g + (endColor.g - startColor.g) * share),
    b: Math.round(startColor.b + (endColor.b - startColor.b) * share),
  };
}

// The drawing's color at x, y in the grid: Main, or with a gradient the
// color of that spot between Main and Main 2. The cell styles color each
// shape with it.
function inkColorAt(x, y) {
  const geometry = gradientGeometry();
  if (!geometry) return uiParams.foregroundColor;
  return mixColors(uiParams.foregroundColor, uiParams.foregroundEndColor, gradientShare(x, y, geometry));
}

// The background of the canvas: Background, or with a gradient running
// from Background to Background 2 across the grid, wherever the grid is.
// Past the grid's corners it keeps the end colors.
function paintBackground() {
  const { r, g, b } = uiParams.backgroundColor;
  background(r, g, b);
  const geometry = gradientGeometry();
  if (!geometry) return;
  const left = gridLeft();
  const top = gridTop();
  const gradient = geometry.type === 'Radial'
    ? drawingContext.createRadialGradient(left + geometry.cx, top + geometry.cy, 0, left + geometry.cx, top + geometry.cy, geometry.r)
    : drawingContext.createLinearGradient(left + geometry.x1, top + geometry.y1, left + geometry.x2, top + geometry.y2);
  gradient.addColorStop(0, svgColor(uiParams.backgroundColor));
  gradient.addColorStop(1, svgColor(uiParams.backgroundEndColor));
  drawingContext.save();
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();
}

// A gradient for an SVG file, from startColor to endColor, named `id` so
// shapes can be filled with it: fill="url(#id)". It is measured in the
// same grid pixels as the shapes that use it ("userSpaceOnUse"), so it
// leans with them on a slanted grid, like on screen.
function svgGradient(id, startColor, endColor, geometry) {
  const rounded = (value) => round(value, SVG_DECIMALS);
  const stops = `<stop offset="0" stop-color="${svgColor(startColor)}"/><stop offset="1" stop-color="${svgColor(endColor)}"/>`;
  if (geometry.type === 'Radial') {
    return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${rounded(geometry.cx)}" cy="${rounded(geometry.cy)}" r="${rounded(geometry.r)}">${stops}</radialGradient>`;
  }
  const { x1, y1, x2, y2 } = geometry;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${rounded(x1)}" y1="${rounded(y1)}" x2="${rounded(x2)}" y2="${rounded(y2)}">${stops}</linearGradient>`;
}

// An SVG file's background, from `left` across `fileWidth`: one rectangle
// marked class="background" (the library leaves it out when exporting
// without background). With a gradient, the gradient goes on the line
// before it.
function backgroundSVG(left, fileWidth) {
  const geometry = gradientGeometry();
  const place = `x="${left}" width="${fileWidth}" height="${gridSize}"`;
  if (!geometry) return [`<rect class="background" ${place} fill="${svgColor(uiParams.backgroundColor)}"/>`];
  return [
    `<defs>${svgGradient('background-gradient', uiParams.backgroundColor, uiParams.backgroundEndColor, geometry)}</defs>`,
    `<rect class="background" ${place} fill="url(#background-gradient)"/>`,
  ];
}

// The SVG file's text, as a list of lines from <svg ...> down to </svg>.
// The library keeps one with each saved variation, to export it later.
// `withBackground: false` leaves the background out: a sheet of iterations
// has one background behind all of them (see sheetFile()).
function drawingSVG({ withBackground = true } = {}) {
  const geometry = gradientGeometry();
  const shapes = [];

  if (!isCellStyle()) {
    // with a gradient, every shade of ink is filled with the same gradient
    // from Main to Main 2, defined once at the top
    if (geometry) shapes.push(`<defs>${svgGradient('ink-gradient', uiParams.foregroundColor, uiParams.foregroundEndColor, geometry)}</defs>`);
    shapes.push(...inkToSVG(geometry ? 'url(#ink-gradient)' : svgColor(uiParams.foregroundColor)));
  } else {
    // each shape in the color of the spot it sits on, like on screen
    for (const { centerX, centerY, shapeWidth, shapeHeight } of inkCells()) {
      const paint = `fill="${svgColor(inkColorAt(centerX, centerY))}"`;
      shapes.push(cellShapeSVG(centerX, centerY, shapeWidth, shapeHeight, paint));
    }
  }
  return svgFile(shapes, { withBackground });
}

// The beginning and end of an SVG file the size of the drawing, around
// `shapes`. The shapes are leaned like the grid on screen (skewX leans the
// other way round than the Slant slider, like shearX). A slanted grid
// reaches past its square on both sides, so the file is that much wider.
// `withBackground` fills the whole file with the background first (see
// backgroundSVG()); without it, the file is see-through, like the grid
// and anchors files.
function svgFile(shapes, { withBackground = false } = {}) {
  const overhang = round(slantOverhang(), SVG_DECIMALS);
  const fileWidth = round(gridSize + overhang * 2, SVG_DECIMALS);
  const middle = gridSize / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fileWidth}" height="${gridSize}" viewBox="${-overhang} 0 ${fileWidth} ${gridSize}">`,
    ...(withBackground ? backgroundSVG(-overhang, fileWidth) : []),
    `<g transform="translate(${middle} ${middle}) skewX(${-uiParams.gridSlant}) translate(${-middle} ${-middle})">`,
    ...shapes,
    '</g>',
    '</svg>',
  ];
}

// One cell style shape as SVG: a square, a circle, or for Parallel Pen a
// rhomboid. `paint` is how it is colored, like fill="rgb(0, 0, 0)".
function cellShapeSVG(centerX, centerY, shapeWidth, shapeHeight, paint) {
  const rounded = (value) => round(value, SVG_DECIMALS);
  if (uiParams.texture === 'squares') {
    const x = rounded(centerX - shapeWidth / 2);
    const y = rounded(centerY - shapeHeight / 2);
    return `<rect x="${x}" y="${y}" width="${rounded(shapeWidth)}" height="${rounded(shapeHeight)}" ${paint}/>`;
  }
  if (uiParams.texture === 'pen') {
    const corners = rhomboidCorners(centerX, centerY, shapeWidth, shapeHeight);
    const points = corners.map(([x, y]) => `${rounded(x)},${rounded(y)}`).join(' ');
    return `<polygon points="${points}" ${paint}/>`;
  }
  return `<ellipse cx="${rounded(centerX)}" cy="${rounded(centerY)}" rx="${rounded(shapeWidth / 2)}" ry="${rounded(shapeHeight / 2)}" ${paint}/>`;
}

// The grid lines as a see-through SVG file, to lay over the drawing. The
// library's preview shows it with the Grid button and can add it to exports.
function gridSVG() {
  const { cellWidth, cellHeight } = cellSize();
  const colorText = svgColor(guideStyle.gridLineColor);
  const opacity = (guideStyle.gridLineOpacity / SVG_FULL_OPACITY).toFixed(3);
  const lines = [];
  for (let column = 0; column <= uiParams.columns; column++) {
    const x = round(column * cellWidth, SVG_DECIMALS);
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${gridSize}"/>`);
  }
  for (let row = 0; row <= uiParams.rows; row++) {
    const y = round(row * cellHeight, SVG_DECIMALS);
    lines.push(`<line x1="0" y1="${y}" x2="${gridSize}" y2="${y}"/>`);
  }
  return svgFile([`<g stroke="${colorText}" stroke-opacity="${opacity}" stroke-width="1">`, ...lines, '</g>']);
}

// The anchors as a see-through SVG file, like drawAnchors() shows them: the
// straight lines between them, a dot (or in the cell styles, a shape) on
// each, and their numbers. The library's preview shows it with the Anchors
// button and can add it to exports.
function anchorsSVG() {
  const points = anchors.map(anchorPosition);
  const colorText = svgColor(uiParams.accentColor);
  const rounded = (value) => round(value, SVG_DECIMALS);
  const parts = [];

  if (points.length >= 2) {
    const corners = points.map(([x, y]) => `${rounded(x)},${rounded(y)}`).join(' ');
    // a polygon closes the loop, a polyline leaves it open
    const tag = uiParams.closed && points.length >= 3 ? 'polygon' : 'polyline';
    const opacity = (guideStyle.polygonOpacity / SVG_FULL_OPACITY).toFixed(3);
    parts.push(`<${tag} points="${corners}" fill="none" stroke="${colorText}" stroke-opacity="${opacity}"/>`);
  }

  const { cellWidth, cellHeight } = cellSize();
  const shapeOpacity = (guideStyle.cellShapeOpacity / SVG_FULL_OPACITY).toFixed(3);
  points.forEach(([x, y], index) => {
    const anchor = anchors[index];
    if (isCellStyle()) {
      const paint = `fill="${colorText}" fill-opacity="${shapeOpacity}" stroke="${colorText}"`;
      parts.push(cellShapeSVG((anchor.column + 0.5) * cellWidth, (anchor.row + 0.5) * cellHeight, cellWidth, cellHeight, paint));
    } else {
      parts.push(`<circle cx="${rounded(x)}" cy="${rounded(y)}" r="${guideStyle.anchorDotSize / 2}" fill="${colorText}"/>`);
    }
    parts.push(`<path d="${numberOutline(index + 1, x + guideStyle.numberOffset, y - guideStyle.numberOffset)}" fill="${colorText}"/>`);
  });
  return svgFile(parts);
}

// An anchor's number as the outline of its digits, for SVG files, in the
// font the canvas writes it in. Written as text, the number would show in
// whatever font the viewer has, because an SVG picture can't load a font.
// p5's textToPaths() gives the font's own drawing commands: M (move), L
// (line), Q and C (curves) and Z (close), each with its points.
function numberOutline(number, x, y) {
  push();
  textSize(guideStyle.numberSize);
  const commands = selectedFont.textToPaths(String(number), x, y);
  pop();
  return commands
    .map(([type, ...numbers]) => type + numbers.map((value) => round(value, SVG_DECIMALS)).join(' '))
    .join('');
}

// The curve's ink is made of pixels with every shade of ink. For the SVG
// file it is traced into smooth outlines (see src/lib/trace.js), one set
// per shade, SVG_INK_LEVELS of them: the faintest shade covers the most,
// the darkest the least. They are laid on top of each other, each a little
// see-through, so where they overlap the ink is as dark as on screen.
// Outlines don't show pixels, so the file stays sharp in Illustrator.
// `paint` is what they are filled with: a color, or url(#ink-gradient).
function inkToSVG(paint) {
  // shade `level` holds everything at least that dark, rounded to the
  // nearest shade: from halfway between it and the shade below
  const levels = Array.from({ length: SVG_INK_LEVELS }, (unused, index) => index + 1);
  const thresholds = levels.map((level) => (level - 0.5) / SVG_INK_LEVELS);
  const outlinesPerLevel = traceOutlines(ink, layerSize(ink), thresholds);

  const paths = [];
  outlinesPerLevel.forEach((outlines, index) => {
    if (outlines.length === 0) return;
    // the outlines are in ink pixels; the file counts in grid pixels
    const pathData = outlinesToPathData(outlines, TRACE_DECIMALS, 1 / inkScale());
    const opacity = layerOpacity(levels[index]).toFixed(4);
    paths.push(`<path fill="${paint}" fill-opacity="${opacity}" fill-rule="evenodd" d="${pathData}"/>`);
  });
  return paths;
}

// How see-through the shade `level` must be, so that it and all the
// fainter shades below it, laid on top of each other, give exactly
// level / SVG_INK_LEVELS of ink. Each layer lets through (1 - opacity) of
// what is behind it, so it only has to add what the layers below are
// missing.
function layerOpacity(level) {
  const inkBelow = (level - 1) / SVG_INK_LEVELS;
  const inkHere = level / SVG_INK_LEVELS;
  return 1 - (1 - inkHere) / (1 - inkBelow);
}

function drawGridLines() {
  const { cellWidth, cellHeight } = cellSize();
  const { r, g, b } = guideStyle.gridLineColor;
  noFill();
  stroke(r, g, b, guideOpacity(guideStyle.gridLineOpacity, 'showGrid'));
  strokeWeight(1);
  for (let row = 0; row < uiParams.rows; row++) {
    for (let column = 0; column < uiParams.columns; column++) {
      rect(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }
}

function drawAnchors() {
  const points = anchors.map(anchorPosition);
  const { r, g, b } = uiParams.accentColor;

  // nothing to draw yet. An empty beginShape()/endShape() makes p5 2 throw an
  // error inside draw(), and that stops the whole sketch from updating.
  if (points.length === 0) return;

  // the control polygon: straight lines between anchors in their order.
  // It needs at least two anchors, and three before it can close into a loop.
  if (points.length >= 2) {
    noFill();
    stroke(r, g, b, guideOpacity(guideStyle.polygonOpacity, 'showAnchors'));
    strokeWeight(1);
    beginShape();
    for (const [x, y] of points) vertex(x, y);
    if (uiParams.closed && points.length >= 3) endShape(CLOSE);
    else endShape();
  }

  textSize(guideStyle.numberSize);
  points.forEach(([x, y], index) => {
    drawAnchorShape(anchors[index], x, y);
    noStroke();
    fill(r, g, b, guideOpacity(SOLID, 'showAnchors'));
    text(index + 1, x + guideStyle.numberOffset, y - guideStyle.numberOffset);
  });
}

// A dot sits exactly on the anchor. The cell styles fill the anchor's whole
// cell instead, so they line up with the grid. They are guides, so they
// keep their size in Animation mode; only the drawing breathes.
function drawAnchorShape(anchor, x, y) {
  const { r, g, b } = uiParams.accentColor;
  if (!isCellStyle()) {
    noStroke();
    fill(r, g, b, guideOpacity(SOLID, 'showAnchors'));
    circle(x, y, guideStyle.anchorDotSize);
    return;
  }

  const { cellWidth, cellHeight } = cellSize();
  // a see-through fill, so overlapping shapes and the curve still show
  fill(r, g, b, guideOpacity(guideStyle.cellShapeOpacity, 'showAnchors'));
  stroke(r, g, b, guideOpacity(SOLID, 'showAnchors'));
  strokeWeight(1);
  drawCellShape((anchor.column + 0.5) * cellWidth, (anchor.row + 0.5) * cellHeight, cellWidth, cellHeight);
}

// Where the grid starts. It sits in the middle of the space between the
// library on the left and the control panel on the right. Folded panels
// (the buttons in the title bar) and hidden ones (g key) leave room, so the
// grid moves towards the middle of the window, gliding along as a panel
// slides away. On a narrow window the panels lie over the drawing, so the
// grid stays in the middle of the window. On the start screen it sits in
// the middle of the start screen's left part, and glides over from there
// once a mode is picked.
function gridLeft() {
  const besidePanels = panelButtons && !panelButtons.isNarrow();
  // the panels are measured on screen; the grid is placed in the sketch's
  // pixels (see fitView())
  const leftSide = library && besidePanels ? coveredFromLeft(library.element) / view.scale : 0;
  const rightSide = panel && besidePanels ? coveredFromRight(panel.domElement) / view.scale : 0;
  const mainLeft = leftSide + (width - leftSide - rightSide - gridSize) / 2;
  return lerp(mainLeft, startGridLeft, startScreenAmount);
}

// How far a panel reaches into the window from the left or right edge: all
// of its width while it is open, less while it slides away, nothing once it
// is folded. A hidden panel (g key) measures 0 wide, so it covers nothing.
function coveredFromLeft(element) {
  const box = element.getBoundingClientRect();
  return constrain(box.right, 0, box.width);
}

function coveredFromRight(element) {
  const box = element.getBoundingClientRect();
  return constrain(width - box.left, 0, box.width);
}

// The grid sits in the middle of the room below the title bar, or on a
// narrow window above the dock; fitView() works it out. It keeps that room
// when the title bar is hidden (g key), so the grid doesn't jump when the
// UI disappears.
function gridTop() {
  return view.gridTop;
}

// How far the grid's top edge is pushed right for every pixel it sits above
// the middle (and the bottom edge pushed left). 0 when the grid is upright.
function slantShift() {
  return Math.tan(radians(uiParams.gridSlant));
}

// How far the slanted grid reaches past the grid's square on each side.
function slantOverhang() {
  return Math.abs(slantShift()) * gridSize / 2;
}

// Leans everything drawn after it, around the middle of the grid, so the
// grid stays centred. The rows stay level; only the columns lean.
function slantGrid() {
  translate(gridSize / 2, gridSize / 2);
  // shearX() pushes things right the lower they are; the grid should lean
  // right the higher they are, so it gets the angle the other way round
  shearX(-radians(uiParams.gridSlant));
  translate(-gridSize / 2, -gridSize / 2);
}

// The mouse position measured from the grid's top left corner. The slant is
// taken back out, so clicks and drags land in the cell you point at.
function gridMouse() {
  const x = mouseX - gridLeft();
  const y = mouseY - gridTop();
  return [x + slantShift() * (y - gridSize / 2), y];
}

// The anchor closest to the mouse, if one is within GRAB_RADIUS.
// Hidden anchors (eye icon or h key) can't be grabbed.
function anchorUnderMouse() {
  // in Multiple view the anchors are small and many: a click saves instead
  if (!uiParams.showAnchors || isMultipleView()) return null;
  const [mouseGridX, mouseGridY] = gridMouse();
  let closest = null;
  // the same reach on screen however small the grid is shown
  let closestDistance = GRAB_RADIUS / view.scale;
  for (const anchor of anchors) {
    const [x, y] = anchorPosition(anchor);
    const distanceToMouse = dist(x, y, mouseGridX, mouseGridY);
    if (distanceToMouse <= closestDistance) {
      closest = anchor;
      closestDistance = distanceToMouse;
    }
  }
  return closest;
}

window.mousePressed = function mousePressed(event) {
  // the control panel sits on top of the canvas, so clicks on it are ignored
  if (event.target.tagName !== 'CANVAS') return;
  if (!isOnMainScreen()) return;

  // Multiple view: a click on an iteration saves it to the library
  if (isMultipleView()) {
    const index = iterationUnderMouse();
    if (index >= 0) library.save(() => captureIteration(index));
    return;
  }

  // pressed on an anchor: start dragging it (a click without moving removes
  // it, which mouseReleased takes care of)
  const hit = anchorUnderMouse();
  if (hit) {
    dragging = { anchor: hit, startX: mouseX, startY: mouseY, moved: false };
    return;
  }

  const { cellWidth, cellHeight } = cellSize();
  const [mouseGridX, mouseGridY] = gridMouse();
  const column = Math.floor(mouseGridX / cellWidth);
  const row = Math.floor(mouseGridY / cellHeight);
  if (column < 0 || column >= uiParams.columns || row < 0 || row >= uiParams.rows) return;

  // a click on an empty cell adds an anchor; on a used cell it removes it
  const index = anchors.findIndex((anchor) => anchor.row === row && anchor.column === column);
  if (index >= 0) anchors.splice(index, 1);
  else anchors.push(makeAnchor(row, column));
  restartDrawing();
};

window.mouseDragged = function mouseDragged() {
  if (!dragging) return;

  // ignore tiny wobbles, so a click doesn't count as a drag
  if (!dragging.moved && dist(mouseX, mouseY, dragging.startX, dragging.startY) < DRAG_THRESHOLD / view.scale) return;
  dragging.moved = true;

  // follow the mouse, but stay on the grid
  const anchor = dragging.anchor;
  const [mouseGridX, mouseGridY] = gridMouse();
  anchor.fx = constrain(mouseGridX, 0, gridSize);
  anchor.fy = constrain(mouseGridY, 0, gridSize);

  // keep track of which cell it's in now, for clicks and for resizing the grid
  const { cellWidth, cellHeight } = cellSize();
  anchor.column = Math.min(uiParams.columns - 1, Math.floor(anchor.fx / cellWidth));
  anchor.row = Math.min(uiParams.rows - 1, Math.floor(anchor.fy / cellHeight));

  restartDrawing();
};

window.mouseReleased = function mouseReleased() {
  if (!dragging) return;
  const anchor = dragging.anchor;

  if (!dragging.moved) {
    // a plain click on an anchor removes it
    anchors.splice(anchors.indexOf(anchor), 1);
  } else {
    // back to a cell anchor: centre of the cell it was dropped in. It also
    // forgets its spot in the font, so it stays where you put it.
    anchor.fx = undefined;
    anchor.fy = undefined;
    anchor.fontX = undefined;
    anchor.fontY = undefined;
    anchor.jx = 0;
    anchor.jy = 0;
  }

  dragging = null;
  restartDrawing();
};

// Only fields you type into are skipped. Checkboxes and buttons in the panel
// keep focus after a click, and Space would otherwise toggle or press them
// again instead of pausing the animation.
function isTypingField(target) {
  const typesYouTypeInto = ['text', 'number', 'search'];
  return (target instanceof HTMLInputElement && typesYouTypeInto.includes(target.type))
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable;
}

window.addEventListener('keydown', (event) => {
  if (event.repeat || isTypingField(event.target)) return;

  if (event.code === 'Space') {
    // preventDefault stops the page from scrolling and a focused panel
    // button from being pressed
    event.preventDefault();
    togglePause();
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    // in 'Glyph' the text sets the anchors, so there is nothing to randomize
    if (uiParams.anchorMode !== 'Glyph') randomAnchors();
  } else if (event.key.toLowerCase() === 'r') {
    // same as the "Randomize All" button: grid, anchors, spline, colors, drift
    // and speed, and in 'Glyph' a new text
    randomizeAll();
  } else if (event.key.toLowerCase() === 'c') {
    // same as the "Reset All" button: every setting back to how the sketch opens
    resetEverything();
  } else if (event.key.toLowerCase() === 's') {
    // same as the library's "Save Iteration" button, flash and slide included
    library.save();
  } else if (event.key.toLowerCase() === 't') {
    toggleAllFolders();
  } else if (event.key === 'g') {
    // src/lib/gui.js hides the control panel on g; the library, the title
    // bar and the labels around the grid go with it
    library.toggle();
    topBar.hidden = !topBar.hidden;
    stageFrame.element.hidden = topBar.hidden;
    dock.element.hidden = topBar.hidden;
  }
});

// The T key: if any folder in the control panel is open, every folder
// closes; if all are closed, they all open. lil-gui marks a closed folder
// with the class lil-closed. Modes always stays open, so it is skipped.
function toggleAllFolders() {
  const folders = panel.folders.filter((folder) => !folder.domElement.classList.contains('lil-always-open'));
  const anyOpen = folders.some((folder) => !folder.domElement.classList.contains('lil-closed'));
  // openAnimated() slides each folder open or shut, like a click on its title
  for (const folder of folders) folder.openAnimated(!anyOpen);
}

function setPaused(paused) {
  animationPaused = paused;
  // the Play/Pause button in the panel shows what a click does next
  playbackControls.forEach((controls) => controls.showPaused(paused));
}

function togglePause() {
  setPaused(!animationPaused);
}

// The Stop button: the drawing starts over from an empty canvas, and waits
// there until you press Play (or Space).
function stopDrawing() {
  restartDrawing();
  setPaused(true);
}

// The eye icons on the Grid and Anchors folders show what is visible right now.
function updateGuideControls() {
  if (gridEye) gridEye.updateDisplay();
  if (anchorsEye) anchorsEye.updateDisplay();
}

// The text and size controls only do something in 'Glyph' mode, so the
// panel only shows them then. In 'Glyph' the text sets the anchors, so the
// Anchor Points slider and the anchors' Randomize arrows are hidden there,
// and Clear becomes Restore.
function showModeControls() {
  const isGlyph = uiParams.anchorMode === 'Glyph';
  for (const controller of glyphControllers) controller.show(isGlyph);
  anchorCountController.show(!isGlyph);
  randomAnchorsIcon.show(!isGlyph);
  clearController.name(isGlyph ? 'Restore' : 'Clear');
  iterationsPerRowController.show(isMultipleView());
}

// There are two "Width" sliders, and only one shows at a time: Fineliner and
// the line styles use it for the size of their marks, the cell styles for
// how much of its cell a full shape covers. Each keeps its own value, so
// switching back and forth doesn't lose either one. Slant is for Parallel
// Pen only.
function showWidthSlider() {
  lineWidthController.show(!isCellStyle());
  shapeWidthController.show(isCellStyle());
  slantController.show(uiParams.texture === 'pen');
}

// The Colors folder only shows what the Gradient switch uses: Main 2 and
// Background 2 while it is on, Angle only for Linear.
function showGradientControls() {
  gradientAngleController.show(uiParams.gradient === 'Linear');
  gradientColorControllers.forEach((controller) => controller.show(uiParams.gradient !== 'Off'));
}

// The Grid arrows: a new number of columns and rows. The anchors are
// rebuilt to fit: in 'Glyph' the text is laid onto the new grid, in 'Shape'
// and 'Animation' new random cells are picked.
function randomizeGrid() {
  uiParams.columns = Math.floor(random(RANDOM_GRID_MIN, GRID_MAX + 1));
  uiParams.rows = Math.floor(random(RANDOM_GRID_MIN, GRID_MAX + 1));
  columnsController.updateDisplay();
  rowsController.updateDisplay();
  if (uiParams.anchorMode === 'Glyph') updateFontAnchors();
  else randomAnchors();
}

// A random value for a slider with this { min, max, step } range, snapped to
// the slider's step, so it is a value you could also have picked by hand.
function randomSliderValue({ min: lowest, max: highest, step: stepSize }) {
  return Math.round(random(lowest, highest) / stepSize) * stepSize;
}

// The Splines arrows: a random style, and random values for every slider.
function randomizeSpline() {
  uiParams.texture = random(Object.values(textureOptions));
  for (const settingName of Object.keys(splineRanges)) uiParams[settingName] = randomSliderValue(splineRanges[settingName]);
  refreshPanel();
  restartDrawing();
}

function randomColor() {
  return { r: Math.floor(random(256)), g: Math.floor(random(256)), b: Math.floor(random(256)) };
}

// The distance between two colors, as if r, g and b were x, y and z.
function colorDistance(firstColor, secondColor) {
  return dist(firstColor.r, firstColor.g, firstColor.b, secondColor.r, secondColor.g, secondColor.b);
}

// The Colors arrows: new colors, the gradients' other ends (Main 2 and
// Background 2) included. They are picked again until both ends of the
// drawing differ enough from both ends of the background, so the drawing
// stays visible all over. The Gradient switch stays as it is.
function randomizeColors() {
  let mainColors;
  let backgroundColors;
  do {
    mainColors = [randomColor(), randomColor()];
    backgroundColors = [randomColor(), randomColor()];
  } while (mainColors.some((mainColor) => backgroundColors.some((backgroundChoice) => colorDistance(mainColor, backgroundChoice) < MIN_COLOR_CONTRAST)));
  [uiParams.foregroundColor, uiParams.foregroundEndColor] = mainColors;
  [uiParams.backgroundColor, uiParams.backgroundEndColor] = backgroundColors;
  uiParams.accentColor = randomColor();
  // also recolors the panel in the new accent
  refreshPanel();
}

// A new text for 'Glyph' mode: 1 to 3 random characters (see
// randomTextLength). The Type here field shows it once the panel is
// refreshed, which Randomize All does.
function randomizeText() {
  const length = Math.floor(random(randomTextLength.min, randomTextLength.max + 1));
  let newText = '';
  for (let index = 0; index < length; index++) newText += random([...randomTextCharacters]);
  uiParams.text = newText;
}

// Random values for the Drift and Speed sliders in the Drift folder.
function randomizeDrift() {
  uiParams.driftReach = randomSliderValue(driftReachRange);
  uiParams.speed = randomSliderValue(speedRange);
  refreshPanel();
}

// "Randomize All": grid, anchors, spline, colors, gradient, drift and speed
// at once. In 'Glyph' the text is new too; in the other modes it stays. The
// mode always stays.
function randomizeAll() {
  // before the grid, so the anchors are built once, from the new text on
  // the new grid
  if (uiParams.anchorMode === 'Glyph') randomizeText();
  randomizeGrid();
  randomizeSpline();
  // before the colors, which refresh the panel, so it shows both
  randomizeGradient();
  randomizeColors();
  randomizeDrift();
}

// Randomize All also picks a gradient: Off, Linear or Radial, and a new
// Angle. The Colors arrows leave the gradient as it is and only pick new
// colors.
function randomizeGradient() {
  uiParams.gradient = random(gradientOptions);
  uiParams.gradientAngle = randomSliderValue(gradientAngleRange);
}

// The arrows on the Gradient subheading in Colors: always a gradient
// (Linear or Radial, never Off), a new Angle, and new other ends, Main 2
// and Background 2. Like the Colors arrows, the new ends are kept different
// enough from the background's and the drawing's colors, so the drawing
// stays visible all over. Main and Background themselves stay as you set
// them, so only the pairs with a new color are compared.
function randomizeGradientSettings() {
  uiParams.gradient = random(gradientOptions.filter((option) => option !== 'Off'));
  uiParams.gradientAngle = randomSliderValue(gradientAngleRange);
  let mainEndColor;
  let backgroundEndChoice;
  do {
    mainEndColor = randomColor();
    backgroundEndChoice = randomColor();
  } while (
    colorDistance(mainEndColor, uiParams.backgroundColor) < MIN_COLOR_CONTRAST
    || colorDistance(mainEndColor, backgroundEndChoice) < MIN_COLOR_CONTRAST
    || colorDistance(uiParams.foregroundColor, backgroundEndChoice) < MIN_COLOR_CONTRAST
  );
  uiParams.foregroundEndColor = mainEndColor;
  uiParams.backgroundEndColor = backgroundEndChoice;
  refreshPanel();
}

// Puts everything back the way the sketch opens: every value in the panel,
// the colors and the guides, with fresh anchors and a running animation.
// Only the mode, the view (Single or Multiple) and the Invert switch stay:
// in 'Glyph' the anchors come from the (reset) text, in 'Shape' and
// 'Animation' they are new random ones.
function resetEverything() {
  const { anchorMode: mode, viewMode, iterationsPerRow, invertColors: isInverted } = uiParams;
  for (const [settingName, value] of Object.entries(startingParams)) {
    uiParams[settingName] = structuredClone(value);
  }
  uiParams.anchorMode = mode;
  // the view stays too: Single stays Single, Multiple keeps its size
  uiParams.viewMode = viewMode;
  uiParams.iterationsPerRow = iterationsPerRow;
  // Invert stays as it is. While it is on, the starting colors are turned
  // around too, so the drawing keeps its dark look.
  uiParams.invertColors = isInverted;
  if (isInverted) invertDrawingColors();
  // both remembered anchor counts start over, and Animation gets its own
  anchorCountPerMode = { Shape: startingParams.anchorCount, Animation: ANIMATION_ANCHOR_COUNT };
  lastGridMode = mode === 'Animation' ? 'Animation' : 'Shape';
  uiParams.anchorCount = anchorCountPerMode[lastGridMode];
  refreshPanel();

  if (mode === 'Glyph') updateFontAnchors();
  else randomAnchors();
}

// The panel doesn't notice values changed in code, so every control is told
// to show its value again. Used by "Reset All", the Randomize arrows and by
// loading from the library.
function refreshPanel() {
  panel.controllersRecursive().forEach((controller) => controller.updateDisplay());
  // that only changes what the controls show, so the page's accent color
  // is set again here as well
  applyAccentColor(uiParams.accentColor);
  // the switches and the Style field are this project's own, so they are told too
  for (const control of [anchorModeController, viewModeController, paintModeController, textureController, gradientController]) {
    control.updateDisplay();
  }
  updateGuideControls();
  showWidthSlider();
  showGradientControls();
  showModeControls();
  showColorTheme();
}

// The library saves and loads variations through these two functions.
// A variation is { settings, anchors, noiseSeed, loopStep, inkPicture }:
//   settings    every value in `uiParams`, except whether the guides show
//   anchors     each anchor where it sits, with its drift right now
//   noiseSeed   so an Animation loop moves exactly as it did
//   loopStep    how far into its loop Animation mode was
//   inkPicture  the ink layer itself, as a PNG picture
// Together they are the exact state of the drawing, so a loaded variation
// continues from where it was saved instead of starting over.
// In Multiple view, Save Iteration keeps the whole sheet as one variation:
// { settings, iterations }, with every iteration's anchors, settings, noise,
// loop step and ink. Loading it brings the sheet back in Multiple view.
function captureVariation() {
  // Everything is collected in draw(), at the next frame, right after the
  // ink is drawn: then the saved state and the pictures match exactly.
  // The video so far comes along as { render }: render(options) makes the
  // MP4 file, see exportVideo(). null if nothing was recorded. The library
  // waits for it, which only takes a moment.
  return new Promise((resolve) => {
    saveWaiting = () => {
      const variation = isMultipleView() ? currentSheet() : currentDrawing();
      const video = videoRecorder.snapshot().then((recording) => recording && {
        render: (options, onProgress) => exportVideo(recording, variation.data, options, onProgress),
      });
      resolve({ ...variation, video });
    };
  });
}

// The drawing as it is right now, for the library. In Multiple view it is
// called with one iteration swapped in (see saveClickedIteration()). It is
// always saved for Single view, so loading it shows it alone.
function currentDrawing() {
  const { showGrid, showAnchors, ...settings } = structuredClone(uiParams);
  settings.viewMode = 'Single';
  const data = {
    settings,
    anchors: anchors.map((anchor) => ({ ...anchor })),
    noiseSeed: currentNoiseSeed,
    loopStep,
    inkPicture: inkToPicture(),
  };
  // the SVG file is made now, because only now the sketch holds this
  // drawing. A Blob keeps it in the browser's memory until it is exported.
  const svg = new Blob([drawingSVG().join('\n')], { type: 'image/svg+xml' });
  // the grid and the anchors as they are now, for the library's preview,
  // and whether they were showing
  const guides = {
    grid: gridSVG().join('\n'),
    anchors: anchorsSVG().join('\n'),
    showGrid: uiParams.showGrid,
    showAnchors: uiParams.showAnchors,
  };
  return { data, picture: drawingPicture(), svg, guides };
}

// Multiple view: the whole sheet of iterations as one variation. Its
// picture is cut out of the canvas like a single drawing's. Its guides are
// every iteration's grid and anchors, so its preview has the same Grid and
// Anchors buttons as a single drawing's.
function currentSheet() {
  const { showGrid, showAnchors, ...settings } = structuredClone(uiParams);
  const data = {
    settings,
    iterations: iterations.map((iteration) => ({
      anchors: iteration.anchors.map((anchor) => ({ ...anchor })),
      settings: { ...iteration.settings },
      noiseSeed: iteration.noiseSeed,
      loopStep: iteration.loopStep,
      inkPicture: inkToPicture(iteration.ink),
    })),
  };
  const svg = new Blob([sheetFile(drawingSVG, { withBackground: true }).join('\n')], { type: 'image/svg+xml' });
  const guides = {
    grid: sheetFile(gridSVG).join('\n'),
    anchors: sheetFile(anchorsSVG).join('\n'),
    showGrid: uiParams.showGrid,
    showAnchors: uiParams.showAnchors,
  };
  return { data, picture: drawingPicture(), svg, guides };
}

// Multiple view: one SVG file for the whole sheet. `makeFile` makes one
// iteration's file (drawingSVG, gridSVG or anchorsSVG); each one is placed
// in its spot, shrunk to fit: its width and height (the first line) are
// swapped for its position and size on the sheet. The sheet is as wide as
// the sheet's picture, slant overhang included, so the drawing and the
// guides line up in the library's preview. `withBackground` puts one
// background behind the whole sheet, like on screen (see backgroundSVG());
// the iterations' own files then come without one.
function sheetFile(makeFile, { withBackground = false } = {}) {
  const overhang = round(slantOverhang(), SVG_DECIMALS);
  const fileWidth = round(gridSize + overhang * 2, SVG_DECIMALS);
  const shapes = withBackground ? backgroundSVG(-overhang, fileWidth) : [];
  iterations.forEach((iteration, index) => {
    withIteration(iteration, () => {
      const { x, y, size, scaleFactor } = iterationPlace(index);
      const file = makeFile({ withBackground: false });
      // a slanted file is wider than its grid by the overhang on each side,
      // which sticks out of the iteration's spot, like on the canvas
      const left = round(x - slantOverhang() * scaleFactor, SVG_DECIMALS);
      const placedWidth = round((gridSize + slantOverhang() * 2) * scaleFactor, SVG_DECIMALS);
      const place = `x="${left}" y="${round(y, SVG_DECIMALS)}" width="${placedWidth}" height="${round(size, SVG_DECIMALS)}"`;
      file[0] = file[0].replace(/width="[^"]*" height="[^"]*"/, place);
      shapes.push(...file);
    });
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fileWidth}" height="${gridSize}" viewBox="${-overhang} 0 ${fileWidth} ${gridSize}">`,
    ...shapes,
    '</svg>',
  ];
}

// The MP4 file of a saved video. `recording` is the drawing alone, as
// recorded; `savedData` is the variation it was saved with, for its grid,
// its anchors and its colors. Without guides the recording is the file.
// With the grid or the anchors, every frame is played back, drawn onto the
// canvas at the video's size, with the guides on top, drawn by the same
// code as on screen, and recorded again: renderVideoExport() does a few
// frames per frame of the sketch. `onProgress` hears how far it has come,
// from 0 to 1. The background always stays: a video can't be see-through.
function exportVideo(recording, savedData, { showGrid, showAnchors }, onProgress) {
  if (!showGrid && !showAnchors) return Promise.resolve(mp4File(recording));
  if (videoExport) return Promise.reject(new Error('Another video is being exported.'));
  return new Promise((resolve, reject) => {
    videoExport = {
      recording, savedData, showGrid, showAnchors, onProgress, resolve, reject,
      reader: createFrameReader(recording),
      encoder: createVideoRecorder({ height: recording.height }),
      // how many frames are done, and the one being drawn
      done: 0,
      frame: null,
    };
  });
}

// draw() calls this while a video is exported: the next few frames, drawn
// at the canvas's top left corner. draw() paints the whole canvas over it
// right after, so it never shows.
function renderVideoExport() {
  const job = videoExport;
  const total = job.recording.frames.length;
  for (let count = 0; count < VIDEO_EXPORT_FRAMES_PER_DRAW && job.done < total; count++) {
    // null while the next frame is still being unpacked: next time then
    job.frame ??= job.reader.take();
    if (!job.frame) break;
    const region = drawVideoExportFrame(job);
    // false while the encoder is busy: this frame is drawn again next time
    if (!job.encoder.addFrame(drawingContext.canvas, 0, 0, region.width, region.height)) break;
    job.frame.close();
    job.frame = null;
    job.done += 1;
  }
  job.onProgress?.(job.done / total);

  if (job.reader.hasFailed()) {
    videoExport = null;
    job.reader.close();
    job.reject(new Error('The video could not be read.'));
  } else if (job.done === total) {
    videoExport = null;
    job.reader.close();
    job.encoder.snapshot().then((recording) => {
      if (recording) job.resolve(mp4File(recording));
      else job.reject(new Error('The video could not be made.'));
    });
  }
}

// One frame of a video export: the recorded drawing with the guides on
// top, as the saved variation had them. For a moment the saved settings
// and anchors stand in for yours, so the usual drawing code draws them.
// The grid is drawn exactly as many canvas pixels tall as the video, so
// nothing is made larger or smaller. Gives back how big that part of the
// canvas is, in canvas pixels.
function drawVideoExportFrame(job) {
  const { settings, anchors: savedAnchors, iterations: savedIterations } = job.savedData;
  const anchorMoves = job.recording.extras[job.done];
  const yourSettings = { ...uiParams };
  const yourAnchors = anchors;
  Object.assign(uiParams, settings, { showGrid: job.showGrid, showAnchors: job.showAnchors });

  const overhang = slantOverhang();
  // one grid pixel is this many canvas units, so the grid comes out exactly
  // the video's height in canvas pixels
  const videoScale = job.recording.height / (gridSize * pixelDensity());
  push();
  scale(videoScale);
  translate(overhang, 0);
  drawingContext.drawImage(job.frame, -overhang, 0, gridSize + overhang * 2, gridSize);
  if (savedIterations) {
    // a sheet: every iteration's guides in its spot, like drawIterations()
    savedIterations.forEach((iteration, index) => {
      const { x, y, scaleFactor } = iterationPlace(index);
      push();
      translate(x, y);
      scale(scaleFactor);
      slantGrid();
      anchors = anchorsMovedBy(iteration.anchors, anchorMoves?.[index]);
      drawGuides();
      pop();
    });
  } else {
    slantGrid();
    anchors = anchorsMovedBy(savedAnchors, anchorMoves);
    drawGuides();
  }
  pop();

  Object.assign(uiParams, yourSettings);
  anchors = yourAnchors;
  return { width: (gridSize + overhang * 2) * videoScale * pixelDensity(), height: job.recording.height };
}

// Multiple view: a click on an iteration saves just that one. The library
// calls this instead of captureVariation(); draw() does the work at the
// next frame, see saveClickedIteration().
function captureIteration(index) {
  return new Promise((resolve) => {
    iterationSaveWaiting = { index, resolve };
  });
}

// Draws the clicked iteration alone and full size, on the slanted grid
// like in Single view, and saves it from there. draw() paints the whole
// frame over it afterwards, so it never shows on screen.
function saveClickedIteration() {
  const { index, resolve } = iterationSaveWaiting;
  iterationSaveWaiting = null;
  const iteration = iterations[index];
  if (!iteration) return;
  withIteration(iteration, () => {
    paintBackground();
    push();
    translate(gridLeft(), gridTop());
    slantGrid();
    drawInkLayer();
    pop();
    resolve(currentDrawing());
  });
}

function applyVariation(data) {
  // a whole sheet of iterations, saved in Multiple view
  if (data.iterations) {
    applySheet(data);
    return;
  }
  const { settings, anchors: savedAnchors, noiseSeed: savedSeed, loopStep: savedLoopStep, inkPicture } = data;
  applySettings(settings);
  // one drawing always comes back alone, also if it was saved before the
  // sketch had a Multiple view
  uiParams.viewMode = 'Single';

  // the saved anchors come back exactly as they were, drift and all, also in
  // Glyph mode, so a shape you changed by hand comes back changed
  // Variations saved before anchors had a restlessness or heading get random ones.
  anchors = savedAnchors.map((anchor) => ({
    restlessness: random(RESTLESSNESS_MIN, RESTLESSNESS_MAX),
    heading: random(TWO_PI),
    ...anchor,
  }));
  currentNoiseSeed = savedSeed;
  noiseSeed(currentNoiseSeed);
  loopStep = savedLoopStep;
  inkLoadNumber += 1;
  pictureToInk(inkPicture);
  // a new video starts from the loaded drawing once it plays
  videoRecorder.reset();
  // paused, so you see it exactly as it was saved. Space continues drawing.
  setPaused(true);
  refreshPanel();
}

// The saved settings back in the panel: only values the sketch still knows,
// in case it has changed since saving, and never whether the guides show.
function applySettings(settings) {
  for (const settingName of Object.keys(startingParams)) {
    if (settingName === 'showGrid' || settingName === 'showAnchors') continue;
    if (settingName in settings) uiParams[settingName] = structuredClone(settings[settingName]);
  }
  // Shape and Animation remember their own anchor count, so the loaded one
  // is stored for its mode
  if (uiParams.anchorMode !== 'Glyph') {
    lastGridMode = uiParams.anchorMode;
    anchorCountPerMode[lastGridMode] = uiParams.anchorCount;
  }
}

// A whole sheet comes back in Multiple view, every iteration exactly as it
// was saved, paused like a single drawing. The first iteration's anchors
// become yours, so Iterate, Restart and the rest start from there.
function applySheet({ settings, iterations: savedIterations }) {
  applySettings(settings);
  uiParams.viewMode = 'Multiple';
  inkLoadNumber += 1;
  iterations = savedIterations.map((saved) => {
    const iteration = {
      ink: newInkLayer(1),
      anchors: saved.anchors.map((anchor) => ({ ...anchor })),
      settings: { ...saved.settings },
      noiseSeed: saved.noiseSeed,
      loopStep: saved.loopStep,
      stepsWaiting: 0,
    };
    pictureToInk(saved.inkPicture, iteration.ink);
    return iteration;
  });
  anchors = savedIterations[0].anchors.map((anchor) => ({ ...anchor }));
  // a new video starts from the loaded sheet once it plays
  videoRecorder.reset();
  setPaused(true);
  refreshPanel();
}

// An empty square canvas `size` pixels wide, off screen, for turning an ink
// layer into a picture and back. Returns its drawing context; the canvas
// itself is context.canvas.
function squareContext(size) {
  const pictureCanvas = document.createElement('canvas');
  pictureCanvas.width = size;
  pictureCanvas.height = size;
  return pictureCanvas.getContext('2d');
}

// An ink layer as a PNG picture, written as text (a "data URL"). Each
// pixel keeps its ink in its opacity: 0 for no ink, 255 for full. Without
// `source` it is the sketch's own ink layer.
function inkToPicture(source = ink) {
  const size = layerSize(source);
  const context = squareContext(size);
  const pixelData = context.createImageData(size, size);
  // every pixel takes four places in the list: red, green, blue, opacity
  for (let index = 0; index < source.length; index++) {
    pixelData.data[index * 4 + 3] = source[index] * 255;
  }
  context.putImageData(pixelData, 0, 0);
  return context.canvas.toDataURL('image/png');
}

// Reads a picture made by inkToPicture() back into an ink layer: `target`,
// or without it the sketch's own. The browser needs a moment to unpack a
// picture, so the ink is empty until it is ready; the drawing is paused
// meanwhile.
function pictureToInk(inkPicture, target = ink) {
  target.fill(0);
  const loadNumber = inkLoadNumber;
  const picture = new Image();
  picture.onload = () => {
    // another variation was loaded, or the drawing restarted, in the meantime
    if (loadNumber !== inkLoadNumber) return;
    // stretched to the layer's size, in case the picture was saved from a
    // layer with fewer pixels, like an iteration loaded into Single view
    const size = layerSize(target);
    const context = squareContext(size);
    context.drawImage(picture, 0, 0, size, size);
    const pixelData = context.getImageData(0, 0, size, size).data;
    for (let index = 0; index < target.length; index++) {
      target[index] = pixelData[index * 4 + 3] / 255;
    }
  };
  picture.src = inkPicture;
}

// The picture the library shows and exports as PNG, as a data URL. It is
// cut out of the canvas where the grid is, at the canvas's full sharpness.
// pixelDensity() is at least INK_SCALE (see setup()): the canvas then has
// that many times as many pixels as it looks, so the picture is that many
// times the grid's size, as detailed as the ink.
// A slanted grid reaches past its square on both sides, so the picture is
// that much wider.
function drawingPicture() {
  const density = pixelDensity();
  const overhang = slantOverhang();
  const pictureWidth = Math.round((gridSize + overhang * 2) * density);
  const pictureHeight = gridSize * density;
  const picture = document.createElement('canvas');
  picture.width = pictureWidth;
  picture.height = pictureHeight;
  picture.getContext('2d').drawImage(
    drawingContext.canvas,
    (gridLeft() - overhang) * density, gridTop() * density, pictureWidth, pictureHeight,
    0, 0, pictureWidth, pictureHeight,
  );
  return picture.toDataURL('image/png');
}

window.windowResized = function windowResized() {
  fitView();
};

// This template's controls, added below the shared ones from src/lib/gui.js.
function addControls(gui, { moveTextControlsTo, moveColorControlsTo }) {
  // the first folder, so the mode is chosen before anything else. It always
  // stays open: its title is only a headline (see .lil-always-open in
  // index.html), and the T key leaves it alone.
  const modes = gui.addFolder('Modes');
  modes.domElement.classList.add('lil-always-open');
  // the panel's headline above it, with the Invert switch on its right
  const modesHeading = makeSectionTitle('Modes');
  modesHeading.classList.add('is-first');
  invertSwitch = createSwitchButton(invertSwitchSettings);
  modesHeading.appendChild(invertSwitch.element);
  modes.domElement.before(modesHeading);
  anchorModeController = addSwitch(modes, uiParams, 'anchorMode', anchorModes, applyMode);
  // one drawing in the middle, or several iterations at once. Switching
  // starts the drawing over.
  viewModeController = addSwitch(modes, uiParams, 'viewMode', ['Single', 'Multiple'], () => {
    showModeControls();
    restartDrawing();
  }, { secondary: true });
  // Multiple only: how many iterations per row, so 2 gives 2 × 2
  iterationsPerRowController = modes
    .add(uiParams, 'iterationsPerRow', iterationsPerRowRange.min, iterationsPerRowRange.max, iterationsPerRowRange.step)
    .name('Per Row')
    .onChange(restartDrawing);
  // text and size sit right below the switch, since they belong to 'Glyph'
  glyphControllers = moveTextControlsTo(modes);

  // the Controls headline between the modes and the folders, with
  // Randomize All and Reset All below it
  addControlsSection(gui);

  // Main, Accent and Background are made by src/lib/gui.js, and moved here.
  const colors = gui.addFolder('Colors');
  addRandomizeIcon(colors, randomizeColors);
  moveColorControlsTo(colors);

  // Below them, under a Gradient subheading with its own arrows, so it is
  // easy to find: Off, Linear or Radial, and while it is on the other ends
  // of the gradients; Angle only for Linear (see showGradientControls())
  addSubheading(colors, 'Gradient', { randomize: randomizeGradientSettings });
  gradientController = addSwitch(colors, uiParams, 'gradient', gradientOptions, showGradientControls, { secondary: true });
  gradientAngleController = colors
    .add(uiParams, 'gradientAngle', gradientAngleRange.min, gradientAngleRange.max, gradientAngleRange.step)
    .name('Angle');
  gradientColorControllers = [
    colors.addColor(uiParams, 'foregroundEndColor', MAX_CHANNEL).name('Main 2'),
    colors.addColor(uiParams, 'backgroundEndColor', MAX_CHANNEL).name('Background 2'),
  ];
  showGradientControls();

  const grid = gui.addFolder('Grid');
  // the eye and the Randomize arrows sit on the right of the folder's title
  gridEye = addEyeToggle(grid, uiParams, 'showGrid');
  addRandomizeIcon(grid, randomizeGrid);
  columnsController = grid.add(uiParams, 'columns', GRID_MIN, GRID_MAX, GRID_STEP).name('Columns').onChange(resizeGrid);
  rowsController = grid.add(uiParams, 'rows', GRID_MIN, GRID_MAX, GRID_STEP).name('Rows').onChange(resizeGrid);
  // only changes how the grid is shown, so the drawing keeps going
  grid.add(uiParams, 'gridSlant', gridSlantRange.min, gridSlantRange.max, gridSlantRange.step).name('Slant');

  const anchorsFolder = gui.addFolder('Anchors');
  anchorsEye = addEyeToggle(anchorsFolder, uiParams, 'showAnchors');
  randomAnchorsIcon = addRandomizeIcon(anchorsFolder, randomAnchors);
  anchorCountController = anchorsFolder
    .add(uiParams, 'anchorCount', anchorCountRange.min, anchorCountRange.max, anchorCountRange.step)
    .name('Anchor Points')
    .onChange(changeAnchorCount);
  anchorsFolder.add({ shuffleOrder }, 'shuffleOrder').name('Iterate');
  // its name follows the mode, see showModeControls()
  clearController = anchorsFolder.add({ clearGrid }, 'clearGrid').name('Clear');

  const splinesFolder = gui.addFolder('Splines');
  addRandomizeIcon(splinesFolder, randomizeSpline);
  // the Style field, without a name in front: click the left half for the
  // style before, the right half for the next
  textureController = addCycler(splinesFolder, uiParams, 'texture', textureOptions, {
    onChange: () => {
      showWidthSlider();
      restartDrawing();
    },
  });
  // ink along the curve or inside it. Switching starts the drawing over, so
  // the old ink doesn't mix with the new.
  paintModeController = addSwitch(splinesFolder, uiParams, 'paintMode', ['Line', 'Fill'], restartDrawing, { secondary: true });
  // each slider takes its min, max and step from `splineRanges`
  const splineSlider = (settingName) => {
    const range = splineRanges[settingName];
    return splinesFolder.add(uiParams, settingName, range.min, range.max, range.step);
  };
  lineWidthController = splineSlider('textureWeight').name('Width').onChange(restartDrawing);
  // below 1 the shapes leave a gap to their neighbours
  shapeWidthController = splineSlider('shapeSize').name('Width');
  slantController = splineSlider('slant').name('Slant');
  showWidthSlider();
  splineSlider('curvature').name('Curvature').onChange(restartDrawing);

  const driftFolder = gui.addFolder('Drift');
  addRandomizeIcon(driftFolder, randomizeDrift);
  driftFolder.add(uiParams, 'driftReach', driftReachRange.min, driftReachRange.max, driftReachRange.step).name('Drift');
  driftFolder.add(uiParams, 'speed', speedRange.min, speedRange.max, speedRange.step).name('Speed');


  // the Playback headline at the end, with Restart and Play/Pause on it
  addPlaybackSection(gui);

  // A closed folder lights up as a whole when the mouse is over it (see
  // index.html), so a click anywhere in it opens it, not only on its title.
  // Clicks on the title itself are already handled by lil-gui.
  for (const folder of gui.folders) {
    folder.domElement.addEventListener('click', (event) => {
      const isClosed = folder.domElement.classList.contains('lil-closed');
      if (isClosed && event.target === folder.domElement) folder.openAnimated();
    });
  }

  // every folder starts closed, so the panel opens short and tidy. Modes
  // always stays open.
  for (const folder of gui.folders) {
    if (!folder.domElement.classList.contains('lil-always-open')) folder.close();
  }

  // hides the controls that the current mode doesn't use
  showModeControls();
}

// After the mode has changed: the anchor count of that mode, its controls in
// the panel, and new anchors (from the text in 'Glyph', random in the others).
function applyMode(mode) {
  swapAnchorCount(mode);
  showModeControls();
  if (mode === 'Glyph') updateFontAnchors();
  else randomAnchors();
}

// Switches to `mode`, as if it was picked in the panel. Nothing happens if
// it is the mode already on show, so the drawing isn't started over.
function switchMode(mode) {
  if (uiParams.anchorMode === mode) return;
  uiParams.anchorMode = mode;
  anchorModeController.updateDisplay();
  applyMode(mode);
}

// A click on one of the start screen's cards: its mode, and the change to
// the main screen begins. (Pointing at a card only calls switchMode().)
function chooseMode(mode) {
  switchMode(mode);
  moveStartScreen(0);
}

// A click on the project's name in the title bar: back to the start screen.
// Nothing happens if it is already there or on its way.
function returnHome() {
  if (startScreen.isOpen()) return;
  dragging = null;
  startScreen.open(uiParams.anchorMode);
  moveStartScreen(1);
}

// The Controls headline in the panel, below the mode switch and above the
// folders, styled like Modes. The dots on its right close every folder, or
// open them all again (like the T key). Below it, Randomize All and Reset
// All side by side. lil-gui has no headlines of its own, so these are plain
// page elements, added in the panel where the folders go. Their look is in
// index.html, under "the section headlines".
function addControlsSection(gui) {
  const heading = makeSectionTitle('Controls');
  const moreButton = makeIconButton(MORE_ICON, 'Open or close all folders (T)', toggleAllFolders);
  moreButton.classList.add('panel-more-button');
  heading.appendChild(moreButton);

  const actions = document.createElement('div');
  actions.className = 'panel-section-actions';
  actions.append(
    makeButton('Randomize All', randomizeAll, RANDOMIZE_ICON),
    makeButton('Reset All', resetEverything, RESET_ICON),
  );
  gui.$children.append(heading, actions);
}

// A headline inside the panel, like Modes, Controls and Playback
function makeSectionTitle(text) {
  const heading = document.createElement('div');
  heading.className = 'panel-section-title';
  heading.append(text);
  return heading;
}

// The Playback section at the end of the panel: its headline, then Restart,
// Play/Pause and Stop as square buttons, and the loop bar.
function addPlaybackSection(gui) {
  const heading = makeSectionTitle('Playback');
  const { restartButton, pauseButton, stopButton, progress } = createPlaybackControls();
  const row = document.createElement('div');
  row.className = 'panel-playback';
  row.append(restartButton, pauseButton, stopButton, progress);
  gui.$children.append(heading, row);
}

// Restart, Play/Pause and Stop as square buttons, and a bar that shows how
// far the Animation loop has come. Clicking or dragging along the bar jumps
// there (see seekLoop()). The control panel and the dock each get a set;
// each set is added to playbackControls, so setPaused() and
// updatePlaybackProgress() keep them all the same. It gives back the
// buttons and the bar to place, and showPaused(paused), which swaps the
// Play/Pause icon, and showProgress(), see below.
function createPlaybackControls() {
  const restartButton = makeIconButton(RESTART_ICON, 'Restart', restartDrawing);
  const pauseButton = makeIconButton(PAUSE_ICON, 'Pause', togglePause);
  const stopButton = makeIconButton(STOP_ICON, 'Stop', stopDrawing);

  // the bar: a thin line with a dot that walks along it
  const progress = document.createElement('div');
  progress.className = 'panel-progress';
  progress.title = 'Animation loop: drag to jump';
  const progressDot = document.createElement('div');
  progressDot.className = 'panel-progress-dot';
  progress.appendChild(progressDot);

  // where the mouse is along the bar, from 0 (left end) to 1 (right end)
  const seekToMouse = (event) => {
    const bar = progress.getBoundingClientRect();
    seekLoop(constrain((event.clientX - bar.left) / bar.width, 0, 1));
  };
  // pointer capture keeps the drag going when the mouse leaves the bar,
  // until the button is let go
  progress.addEventListener('pointerdown', (event) => {
    progress.setPointerCapture(event.pointerId);
    seekToMouse(event);
  });
  progress.addEventListener('pointermove', (event) => {
    if (progress.hasPointerCapture(event.pointerId)) seekToMouse(event);
  });

  // while the drawing runs, the button offers to pause it; while it is
  // paused, to play it again
  const showPaused = (paused) => {
    setButtonIcon(pauseButton, paused ? PLAY_ICON : PAUSE_ICON, paused ? 'Play' : 'Pause');
  };
  showPaused(animationPaused);

  // `share` runs from 0 (the loop starts) to 1 (it starts over). Only
  // Animation mode has a loop; in the other modes the bar is faded out, the
  // dot waits at the start and the bar can't be dragged. draw() calls this
  // every frame, so the page is only changed when something is different.
  const showProgress = (share, isLooping) => {
    const place = `${(share * 100).toFixed(1)}%`;
    if (progressDot.style.left !== place) progressDot.style.left = place;
    progress.classList.toggle('is-idle', !isLooping);
  };

  const controls = { restartButton, pauseButton, stopButton, progress, showPaused, showProgress };
  playbackControls.push(controls);
  return controls;
}

// The Playback bars follow the Animation loop. In Multiple view every
// iteration runs its own loop at its own speed; the bars follow the first.
function updatePlaybackProgress() {
  const isLooping = uiParams.anchorMode === 'Animation';
  const step = isMultipleView() ? (iterations[0]?.loopStep ?? 0) : loopStep;
  const share = isLooping ? step / uiParams.loopLength : 0;
  playbackControls.forEach((controls) => controls.showProgress(share, isLooping));
}

// THE DOCK, below the grid on a narrow window (a phone, or a tablet held
// upright), where the panels are folded away: the loop bar, centred under
// the grid, and below it six buttons in two rows. Restart, Play/Pause and
// Stop on top, Randomize All, Save Iteration and Reset All below. They do
// the same as the buttons in the panels. fitView() places it; its look is
// in index.html, under "the dock".
function createDock() {
  const { restartButton, pauseButton, stopButton, progress } = createPlaybackControls();
  const buttons = document.createElement('div');
  buttons.className = 'dock-buttons';
  buttons.append(
    restartButton,
    pauseButton,
    stopButton,
    makeButton('Randomize', randomizeAll, RANDOMIZE_ICON),
    makeButton('Save', () => library.save(), SAVE_ICON),
    makeButton('Reset', resetEverything, RESET_ICON),
  );

  const element = document.createElement('div');
  element.className = 'dock';
  element.append(progress, buttons);
  document.body.appendChild(element);
  return { element };
}

// THE VIEW. The grid is shown at its real size, gridSize pixels, when the
// window has room for it, and shrinks to fit when it hasn't:
//   on a wide window, between the two panels and below the title bar, in
//     the middle of the room that is left
//   on a narrow window (a phone, a tablet held upright), across the width,
//     with the dock below it. The grid, its labels and the dock sit
//     together in the middle of the room below the title bar.
//
// The sketch works in its own pixels all the same: the canvas is made
// larger by 1 / view.scale, and the browser shows it smaller, as big as
// the window. So drawing, dragging and the exports work exactly as at the
// real size, and p5 turns the mouse position back into the canvas's
// pixels by itself. Runs at the start and whenever the window changes size.
function fitView() {
  let roomAcross;
  let roomDown;
  let dockHeight = 0;
  if (panelButtons.isNarrow()) {
    // the panels lie over the drawing here; their padding stays free on
    // both sides
    const sideRoom = cssPixels('--panel-padding');
    dockHeight = dock.element.offsetHeight;
    roomAcross = windowWidth - sideRoom * 2;
    roomDown = windowHeight - topBarHeight - STAGE_LABEL_ROOM * 2 - DOCK_GAP - dockHeight - sideRoom;
  } else {
    // A panel hidden with the g key measures 0 wide. It still counts with
    // the width it had, so the grid keeps its size when the UI is hidden.
    // Folded panels count too: the grid only moves to the middle then.
    view.libraryWidth = library.element.offsetWidth || view.libraryWidth;
    view.controlsWidth = panel.domElement.offsetWidth || view.controlsWidth;
    roomAcross = windowWidth - view.libraryWidth - view.controlsWidth - cssPixels('--panel-gap') * 2;
    roomDown = windowHeight - topBarHeight - STAGE_LABEL_ROOM * 2;
  }
  view.scale = Math.min(1, roomAcross / gridSize, roomDown / gridSize);

  // the grid (and the dock below it, if there is one) in the middle of the
  // room below the title bar
  const shownGridSize = gridSize * view.scale;
  const dockRoom = dockHeight > 0 ? DOCK_GAP + dockHeight : 0;
  const blockHeight = STAGE_LABEL_ROOM * 2 + shownGridSize + dockRoom;
  const blockTop = topBarHeight + Math.max(0, (windowHeight - topBarHeight - blockHeight) / 2);
  const gridScreenTop = blockTop + STAGE_LABEL_ROOM;
  view.gridTop = gridScreenTop / view.scale;
  dock.element.style.top = `${gridScreenTop + shownGridSize + STAGE_LABEL_ROOM + DOCK_GAP}px`;

  const canvasWidth = windowWidth / view.scale;
  const canvasHeight = windowHeight / view.scale;
  resizeCanvas(canvasWidth, canvasHeight);
  // At least as many canvas pixels as ink pixels, also on screens that
  // aren't Retina, so the saved picture keeps the ink's full detail. Only
  // on a phone or tablet (a touch screen) a very large canvas gets fewer,
  // to stay below MAX_TOUCH_CANVAS_PIXELS.
  const fullDensity = Math.max(displayDensity(), INK_SCALE);
  const isTouchScreen = navigator.maxTouchPoints > 0;
  const largestDensity = isTouchScreen ? Math.sqrt(MAX_TOUCH_CANVAS_PIXELS / (canvasWidth * canvasHeight)) : fullDensity;
  pixelDensity(Math.min(fullDensity, largestDensity));
  // shown as big as the window, whatever its own size
  drawingContext.canvas.style.width = `${windowWidth}px`;
  drawingContext.canvas.style.height = `${windowHeight}px`;
  // the labels around the grid and the dock take the grid's size on screen
  document.documentElement.style.setProperty('--shown-grid-size', `${shownGridSize}px`);
}

// A size set in index.html, like --panel-padding, in pixels
function cssPixels(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
}

// The Invert switch, as the panel and the start screen both have it.
const invertSwitchSettings = {
  label: 'Invert',
  title: 'Invert all colors',
  isOn: () => uiParams.invertColors,
  onClick: () => invertColorsSmoothly(),
};

// Inverts the colors with a fade: the browser keeps a picture of the page
// as it is, inverts the colors, and fades the picture out over the page in
// its new colors, the drawing included (a "view transition"). How long it
// takes is --theme-fade-duration in index.html. Browsers that can't do
// this (older Firefox) invert the colors at once.
function invertColorsSmoothly() {
  if (!document.startViewTransition) {
    invertColors();
    return;
  }
  document.startViewTransition(() => invertColors());
}

// The start screen's Anchors switch: shows or hides the anchors there, see
// startGuides.
const startAnchorsSwitchSettings = {
  label: 'Anchors',
  isOn: () => startGuides.showAnchors,
  onClick: () => {
    startGuides.showAnchors = !startGuides.showAnchors;
    startScreen.updateSwitches();
  },
};

// Turns every color around: light becomes dark and dark becomes light. Main
// and Background are inverted for real, so the color pickers, the saved
// variations and the exports change with them. The page around the drawing
// gets its inverted colors from index.html (see showColorTheme()). The
// accent keeps its color, so the guides stay recognisable.
function invertColors() {
  uiParams.invertColors = !uiParams.invertColors;
  invertDrawingColors();
  refreshPanel();
}

// Main and Background turned around, and the other ends of their
// gradients, Main 2 and Background 2
function invertDrawingColors() {
  for (const colorName of ['foregroundColor', 'backgroundColor', 'foregroundEndColor', 'backgroundEndColor']) {
    uiParams[colorName] = invertedColor(uiParams[colorName]);
  }
}

function invertedColor({ r, g, b }) {
  return { r: MAX_CHANNEL - r, g: MAX_CHANNEL - g, b: MAX_CHANNEL - b };
}

// The panels, the library and the title bar follow the Invert switch: the
// class is-inverted on the page swaps their colors (see index.html).
function showColorTheme() {
  document.body.classList.toggle('is-inverted', uiParams.invertColors);
  if (invertSwitch) invertSwitch.updateDisplay();
  if (startScreen) startScreen.updateSwitches();
}

// The title bar across the top of the window: the project's name on the
// left (a click on it goes back to the start screen), the title
// of the middle section in the middle, and the subtitle on the right. At
// each end sits the button that folds the panel below it away. The texts
// are projectTitle and projectSubtitle in src/config.js; the look is in
// index.html, under "the title bar".
function createTopBar() {
  const bar = document.createElement('header');
  bar.className = 'top-bar';

  // a button: clicking the name goes back to the start screen
  const brand = document.createElement('button');
  brand.className = 'top-bar-brand';
  brand.title = 'Back to the start';
  brand.textContent = projectTitle;
  brand.addEventListener('click', returnHome);

  const title = document.createElement('div');
  title.className = 'top-bar-title';
  title.textContent = 'Iteration';

  const subtitle = document.createElement('div');
  subtitle.className = 'top-bar-subtitle';
  subtitle.textContent = projectSubtitle;

  // the two ends of the bar: the library's button and the name on the left,
  // the subtitle and the control panel's button on the right. On the start
  // screen the buttons are hidden and the name and the subtitle move out
  // to the edges (see index.html).
  const start = document.createElement('div');
  start.className = 'top-bar-start';
  start.append(panelButtons.library, brand);
  const end = document.createElement('div');
  end.className = 'top-bar-end';
  end.append(subtitle, panelButtons.controls);

  bar.append(start, title, end);
  document.body.appendChild(bar);
  return bar;
}

// Small labels around the grid, like on a drawing board: what is shown and
// how many pixels a PNG of it gets above the grid, the grid and the anchors below it, and a
// + mark beyond each corner. It lies exactly over the grid and lets every
// click through. updateStageFrame() keeps it in place. Its look and size
// are in index.html, under "the labels around the grid".
function createStageFrame() {
  const frame = document.createElement('div');
  frame.className = 'stage-frame';

  const labels = {};
  for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
    const label = document.createElement('span');
    label.className = `stage-label is-${corner}`;
    const mark = document.createElement('span');
    mark.className = `stage-mark is-${corner}`;
    frame.append(label, mark);
    labels[corner] = label;
  }

  document.body.appendChild(frame);
  return { element: frame, labels };
}

// Moves the labels to where the grid is and writes what they say. draw()
// calls this every frame, so the page is only changed when something is
// different.
function updateStageFrame() {
  const { element, labels } = stageFrame;
  if (element.hidden) return;

  // the grid's place in the sketch's pixels, turned into pixels on screen
  const place = `translate(${gridLeft() * view.scale}px, ${gridTop() * view.scale}px)`;
  if (element.style.transform !== place) element.style.transform = place;

  const perRow = uiParams.iterationsPerRow;
  showText(labels['top-left'], isMultipleView() ? `Iterations ${perRow} × ${perRow}` : 'Iteration canvas');
  // the PNG resolution picked in the library's preview. A slanted grid
  // makes the picture wider by its overhang on both sides, like the PNG.
  const pictureHeight = library.resolution();
  const pictureWidth = Math.round((pictureHeight * (gridSize + slantOverhang() * 2)) / gridSize);
  showText(labels['top-right'], `${pictureWidth} × ${pictureHeight}`);
  showText(labels['bottom-left'], `Grid ${uiParams.columns} × ${uiParams.rows}`);
  showText(labels['bottom-right'], `${anchors.length} anchors${animationPaused ? ' · paused' : ''}`);
}

function showText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

// The panels size themselves around the grid (see --panel-width in
// index.html), so they are told how big the grid is.
document.documentElement.style.setProperty('--grid-size', `${gridSize}px`);

// The mode names on the start screen are written in the foregroundColor
// from src/config.js. The Invert switch turns it around, like the drawing,
// so the inverted color is handed over too (index.html picks it).
const invertedForegroundColor = invertedColor(foregroundColor);
document.documentElement.style.setProperty(
  '--foreground-color',
  `rgb(${foregroundColor.r}, ${foregroundColor.g}, ${foregroundColor.b})`,
);
document.documentElement.style.setProperty(
  '--inverted-foreground-color',
  `rgb(${invertedForegroundColor.r}, ${invertedForegroundColor.g}, ${invertedForegroundColor.b})`,
);

// Builds the control panel and the library, then starts p5. p5 looks for
// the setup() and draw() you defined above and runs them.
library = createLibrary({ capture: captureVariation, apply: applyVariation });
panelButtons = createPanelButtons();
topBar = createTopBar();
topBarHeight = topBar.offsetHeight;
stageFrame = createStageFrame();
dock = createDock();
panel = createGUI({
  params: uiParams,
  // lil-gui's own title. It is hidden (see index.html): a click on it would
  // fold the whole panel away. The panel's headlines are made in
  // addControls() instead.
  title: 'Modes',
  // no export buttons in the panel: the s key saves to the library, and
  // the library exports saved variations as PNG or SVG
  exportPNG: false,
  onTextChange: updateFontAnchors,
  onTextSizeChange: updateFontAnchors,
  // the h key hides the grid and anchors; the eye icons follow
  onHelpersToggle: updateGuideControls,
  addControls,
});
startScreen = createStartScreen({
  modes: anchorModes,
  startingMode: uiParams.anchorMode,
  onPreview: switchMode,
  onChoose: chooseMode,
  switches: [
    invertSwitchSettings,
    startAnchorsSwitchSettings,
  ],
});
new p5();
