// Project: ANCYPH – Xuan Nam Anh Hoang & Quang Chien Nguyen @HTW-Berlin, 2026
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
//                     In Multiple, a click on one iteration saves it to the
//                     library; Save Iteration saves the whole sheet.
// Double-click a name In the control panel: put that setting back to where
//                     it started.
//
// Arrows icon         (crossing arrows) New random values for the folder whose
//                     title it sits in.
// Randomize All       New grid, anchors, spline, colors, drift and speed at once.
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
// G – Hide UI         Hide or show the control panel and the library.
// T – Toggle folders  Close every folder in the control panel, or open them
//                     all again if they are all closed. Modes stays open.
// Space – Pause/Play  Pause or continue the animation.
// R – Randomize All   Randomize EVERYTHING.
// C – Reset All       Every setting back to how the sketch opens (same as
//                     the Reset All button). The mode stays.
// Left / Right        New random anchors (same as the Anchors arrows), not in 'Glyph'.
// S – Save Iteration  Keep the drawing in the library (same as the library's
//                     Save Iteration button).
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
import { createGUI, addSwitch, addCycler, addEyeToggle, addRandomizeIcon, colorPanelInAccent } from './lib/gui.js';
import { createLibrary } from './lib/library.js';
import { gridSize, backgroundColor, foregroundColor, accentColor, startingText, projectTitle } from './config.js';
import { applyFont, defaultFont, textToCurves } from './lib/font/index.js';

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
// iterations at once, 4 shows 4 × 4 = 16. More are smaller and draw slower.
const iterationsPerRowRange = { min: 2, max: 4, step: 1 };
// Multiple view: the gap between two iterations, in pixels of the grid.
const ITERATION_GAP = 16;
// Multiple view: each iteration nudges these settings away from yours, by
// up to this share of the slider's range either way (0.15 = 15 %).
const ITERATION_NUDGE = 0.15;
const iterationNudgeRanges = { ...splineRanges, driftReach: driftReachRange };

// The arrows on the Colors folder: how different Main and Background must
// be at least, measured as a distance between the two colors (0 = the same,
// about 441 = black and white). Otherwise the drawing could vanish.
const MIN_COLOR_CONTRAST = 150;

// The values the control panel changes. The colors start at whatever you set
// in src/config.js, and are { r, g, b } objects with channels from 0 to 255.
const uiParams = {
  text: startingText,
  textSize: 300,       // the middle of the Size slider (100 to 500)

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
};

// A copy of every value as the sketch opens with it, for "Reset All". It is a
// real copy (structuredClone), so changing a color later doesn't change it.
const startingParams = structuredClone(uiParams);

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
const speckSizes = {
  chalkRadius: 0.5,
  hairRadius: 0.5,
  grainRadius: 0.7,
  grainSpread: 0.4,
};

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

// 'Glyph' mode: the empty space kept around the text, as a share of the grid
// on each side.
const FONT_MARGIN = 0.1;

// The cell styles: how many solid lines' worth of ink a cell needs before
// its shape fills the whole cell. Higher = shapes grow more slowly.
const CELL_FULL_LINES = 8;
// SVG export of the curve styles: how many shades of ink are kept. More
// shades look closer to the screen but make a bigger file.
const SVG_INK_LEVELS = 32;
// SVG export: positions are rounded to this many decimals; more would only
// make the file longer.
const SVG_DECIMALS = 2;

// How the guides look. Opacities run from 0 (invisible) to 255 (solid).
const guideStyle = {
  gridLineColor: { r: 128, g: 128, b: 128 },
  gridLineOpacity: 120,
  polygonOpacity: 90,    // the straight lines between the anchors
  cellShapeOpacity: 60,  // the see-through shapes on anchors in the cell styles
  anchorDotSize: 7,
  numberSize: 12,
  numberOffset: 6,       // how far the number sits up and right of its anchor
};
// The opacities above run to 255, as in p5; SVG files count them up to 1.
const SVG_FULL_OPACITY = 255;

// How close (in pixels) the mouse has to be to an anchor to grab it, and how
// far it has to move before a click counts as a drag.
const GRAB_RADIUS = 10;
const DRAG_THRESHOLD = 3;

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
// { ink, anchors, nudges, noiseSeed, loopStep }: its own ink layer and
// anchors, how far its settings differ from yours, and its own noise and
// place in the Animation loop. See buildIterations().
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

// The ink layer: one number per pixel of the grid, 0 = empty, 1 = fully
// inked. `inkImage` is the picture it is turned into for the screen.
let ink;
let inkImage;

// The control panel, the library of saved variations on the left, and the
// panel controls the code changes or hides after they are made.
let panel;
let library;
let stageTitle;
let playbackControls;
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
let viewModeController;
let iterationsPerRowController;
let textureController;
let slantController;

window.setup = async function setup() {
  createCanvas(windowWidth, windowHeight);
  ink = new Float32Array(gridSize * gridSize);
  inkImage = createImage(gridSize, gridSize);
  // always the starting font from src/config.js: the panel has no font picker
  selectedFont = await applyFont(defaultFont);
  // the starting mode decides where the first anchors come from
  if (uiParams.anchorMode === 'Glyph') updateFontAnchors();
  else randomAnchors();
};

window.draw = function draw() {
  // how many drawing steps this frame gets. In Multiple view every
  // iteration gets the same number.
  let steps = 0;
  if (!animationPaused) {
    stepsWaiting += uiParams.speed;
    steps = Math.floor(stepsWaiting);
    stepsWaiting -= steps;
  }

  // a clicked iteration is saved first: it is drawn alone, full size, so
  // the saved picture looks like a drawing made in Single view. The frame
  // then starts over with the background below, so it never shows.
  if (iterationSaveWaiting) saveClickedIteration();

  background(uiParams.backgroundColor.r, uiParams.backgroundColor.g, uiParams.backgroundColor.b);
  if (isMultipleView()) drawIterations(steps);
  else drawSingle(steps);

  // a hand cursor shows which anchors can be grabbed, or in Multiple view
  // which iteration a click saves
  if (dragging) cursor('grabbing');
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
  if (saveWaiting) {
    saveWaiting();
    saveWaiting = null;
  }
  drawGuides();
  pop();
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

function drawGuides() {
  if (uiParams.showGrid) drawGridLines();
  if (uiParams.showAnchors) drawAnchors();
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
function drawIterations(steps) {
  iterations.forEach((iteration, index) => {
    withIteration(iteration, () => {
      push();
      placeIteration(index);
      slantGrid();
      advanceDrawing(steps);
      drawInkLayer();
      pop();
    });
  });

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
  const hovered = iterationUnderMouse();
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
// its ink, its anchors, its noise and place in the Animation loop, and your
// settings with its nudges added. All the drawing code then works on the
// iteration without knowing it. Afterwards everything is swapped back.
function withIteration(iteration, action) {
  const own = { ink, anchors, loopStep, currentNoiseSeed };
  const yourValues = {};
  for (const [settingName, nudge] of Object.entries(iteration.nudges)) {
    const { min: lowest, max: highest } = iterationNudgeRanges[settingName];
    yourValues[settingName] = uiParams[settingName];
    uiParams[settingName] = constrain(uiParams[settingName] + nudge, lowest, highest);
  }
  ink = iteration.ink;
  anchors = iteration.anchors;
  loopStep = iteration.loopStep;
  currentNoiseSeed = iteration.noiseSeed;
  noiseSeed(currentNoiseSeed);

  action();

  iteration.loopStep = loopStep;
  ink = own.ink;
  anchors = own.anchors;
  loopStep = own.loopStep;
  currentNoiseSeed = own.currentNoiseSeed;
  if (currentNoiseSeed !== undefined) noiseSeed(currentNoiseSeed);
  Object.assign(uiParams, yourValues);
}

// Multiple view: a fresh set of iterations, Per Row × Per Row of them. Each
// starts from your anchors and settings with an empty ink layer, its own
// small nudges (see ITERATION_NUDGE), and its own way of drifting: every
// anchor gets a new heading, restlessness and rhythm.
function buildIterations() {
  const count = uiParams.iterationsPerRow ** 2;
  iterations = Array.from({ length: count }, (unused, index) => ({
    ink: new Float32Array(gridSize * gridSize),
    anchors: anchors.map((anchor) => ({
      ...anchor,
      heading: random(TWO_PI),
      restlessness: random(RESTLESSNESS_MIN, RESTLESSNESS_MAX),
      phase: random(TWO_PI),
    })),
    nudges: Object.fromEntries(
      Object.entries(iterationNudgeRanges).map(([settingName, { min: lowest, max: highest }]) => [settingName, random(-1, 1) * ITERATION_NUDGE * (highest - lowest)]),
    ),
    noiseSeed: Date.now() + index,
    loopStep: 0,
  }));
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

  for (let mark = 0; mark < uiParams.dotsPerStep / fogThinning; mark++) {
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
        addInk(x + acrossX * offset, y + acrossY * offset, speckSizes.chalkRadius, opacity);
        break;
      // thin strokes straight across the line, like hairs
      case 'hair':
        addInkStroke(
          x + acrossX * offset, y + acrossY * offset,
          x - acrossX * offset, y - acrossY * offset,
          speckSizes.hairRadius, opacity,
        );
        break;
      // soft blobs scattered across the line
      case 'fog':
        addInk(x + acrossX * offset, y + acrossY * offset, size, opacity * fogThinning);
        break;
      // pairs of small specks on both sides of the line
      case 'grain': {
        const spread = offset * speckSizes.grainSpread;
        addInk(x + acrossX * spread, y + acrossY * spread, speckSizes.grainRadius, opacity);
        addInk(x - acrossX * spread, y - acrossY * spread, speckSizes.grainRadius, opacity);
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
  const corners = [];
  for (let piece = 0; piece < pieceCount; piece++) {
    corners.push(pointOnSpline(points, piece / FILL_PIECES_PER_SEGMENT));
  }

  // only the rows the curve reaches, and never outside the grid
  const yValues = corners.map(([, y]) => y);
  const topRow = Math.max(0, Math.floor(Math.min(...yValues)));
  const bottomRow = Math.min(gridSize - 1, Math.ceil(Math.max(...yValues)));
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
      const endColumn = Math.min(gridSize - 1, Math.floor(crossings[pair + 1] - 0.5));
      for (let column = startColumn; column <= endColumn; column++) {
        if (random() < FILL_DOT_CHANCE) addInkToPixel(column, row, opacity);
      }
    }
  });
}

// A mark spreads its ink over its width, so wide marks are not darker than
// thin ones.
function addInk(x, y, radius, opacity) {
  const markWidth = Math.max(1, radius * 2);
  const markOpacity = (opacity * uiParams.textureOpacity) / markWidth;
  const centerX = Math.floor(x);
  const centerY = Math.floor(y);

  // A mark less than a pixel wide only ever covers the pixel it sits on, so
  // it skips the loop below. Hair, Chalk and Grain are made of these.
  if (radius < 1) {
    addInkToPixel(centerX, centerY, markOpacity);
    return;
  }

  // Row by row, only the pixels inside the circle are visited: halfWidth is
  // how far the circle reaches left and right on that row. This is much
  // faster for wide marks like Fog than checking every pixel of the square.
  const reach = Math.ceil(radius);
  for (let offsetY = -reach; offsetY <= reach; offsetY++) {
    // rows above or below the circle are skipped
    if (Math.abs(offsetY) > radius) continue;
    const halfWidth = Math.floor(Math.sqrt(radius * radius - offsetY * offsetY));
    for (let offsetX = -halfWidth; offsetX <= halfWidth; offsetX++) {
      addInkToPixel(centerX + offsetX, centerY + offsetY, markOpacity);
    }
  }
}

// Adds ink to one pixel, unless it lies outside the grid.
function addInkToPixel(pixelX, pixelY, markOpacity) {
  if (pixelX < 0 || pixelY < 0 || pixelX >= gridSize || pixelY >= gridSize) return;
  const index = pixelY * gridSize + pixelX;
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

// Turns the ink layer into an image in the Main color, transparent where
// there is no ink, so color changes in the panel apply right away.
function drawInk() {
  const { r, g, b } = uiParams.foregroundColor;
  inkImage.loadPixels();
  // every pixel takes four places in the list: red, green, blue, opacity
  const pixelValues = inkImage.pixels;
  for (let index = 0; index < ink.length; index++) {
    const place = index * 4;
    pixelValues[place] = r;
    pixelValues[place + 1] = g;
    pixelValues[place + 2] = b;
    pixelValues[place + 3] = ink[index] * 255;
  }
  inkImage.updatePixels();
  image(inkImage, 0, 0);
}

// The cell styles: the ink is counted per grid cell, and each cell gets a
// solid shape that grows with the ink in it. An empty cell shows nothing; a
// cell with CELL_FULL_LINES lines' worth of ink is filled.
// Returns one { centerX, centerY, shapeWidth, shapeHeight } per shape, so the screen
// and the SVG export draw exactly the same thing.
function inkCells() {
  const { cellWidth, cellHeight } = cellSize();
  const inkPerCell = new Float32Array(uiParams.rows * uiParams.columns);
  for (let pixelY = 0; pixelY < gridSize; pixelY++) {
    const row = Math.min(uiParams.rows - 1, Math.floor(pixelY / cellHeight));
    for (let pixelX = 0; pixelX < gridSize; pixelX++) {
      const value = ink[pixelY * gridSize + pixelX];
      if (value === 0) continue;
      const column = Math.min(uiParams.columns - 1, Math.floor(pixelX / cellWidth));
      inkPerCell[row * uiParams.columns + column] += value;
    }
  }

  // a solid line straight across a cell holds about one cell width of ink
  const fullCell = CELL_FULL_LINES * Math.min(cellWidth, cellHeight);
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

function drawInkCells() {
  noStroke();
  fill(uiParams.foregroundColor.r, uiParams.foregroundColor.g, uiParams.foregroundColor.b);
  for (const { centerX, centerY, shapeWidth, shapeHeight } of inkCells()) {
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

// The SVG file's text, as a list of lines from <svg ...> down to </svg>.
// The library keeps one with each saved variation, to export it later.
function drawingSVG() {
  const colorText = svgColor(uiParams.foregroundColor);
  const shapes = [];

  if (!isCellStyle()) {
    shapes.push(...inkToSVG(colorText));
  } else {
    for (const { centerX, centerY, shapeWidth, shapeHeight } of inkCells()) {
      shapes.push(cellShapeSVG(centerX, centerY, shapeWidth, shapeHeight, `fill="${colorText}"`));
    }
  }
  return svgFile(shapes, uiParams.backgroundColor);
}

// The beginning and end of an SVG file the size of the drawing, around
// `shapes`. The shapes are leaned like the grid on screen (skewX leans the
// other way round than the Slant slider, like shearX). A slanted grid
// reaches past its square on both sides, so the file is that much wider.
// With a `backgroundColor`, the whole file is filled with it first; without
// one, the file is see-through, like the grid and anchors files.
function svgFile(shapes, backgroundColor) {
  const overhang = round(slantOverhang(), SVG_DECIMALS);
  const fileWidth = round(gridSize + overhang * 2, SVG_DECIMALS);
  const middle = gridSize / 2;
  const backgroundShapes = backgroundColor
    ? [`<rect x="${-overhang}" width="${fileWidth}" height="${gridSize}" fill="${svgColor(backgroundColor)}"/>`]
    : [];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fileWidth}" height="${gridSize}" viewBox="${-overhang} 0 ${fileWidth} ${gridSize}">`,
    ...backgroundShapes,
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
    const numberX = rounded(x + guideStyle.numberOffset);
    const numberY = rounded(y - guideStyle.numberOffset);
    parts.push(`<text x="${numberX}" y="${numberY}" font-size="${guideStyle.numberSize}" font-family="sans-serif" fill="${colorText}">${index + 1}</text>`);
  });
  return svgFile(parts);
}

// The curve's ink is made of pixels with every shade of ink, so it is rounded to
// SVG_INK_LEVELS shades. Each row is cut into runs of pixels with the same
// shade; every run becomes a 1 pixel tall strip. All strips of one shade
// share one <path>, which keeps the file small enough to open.
function inkToSVG(colorText) {
  const stripsPerShade = Array.from({ length: SVG_INK_LEVELS }, () => []);
  const shadeAt = (x, y) => Math.round(ink[y * gridSize + x] * SVG_INK_LEVELS);

  for (let y = 0; y < gridSize; y++) {
    let x = 0;
    while (x < gridSize) {
      const shade = shadeAt(x, y);
      let runEnd = x + 1;
      while (runEnd < gridSize && shadeAt(runEnd, y) === shade) runEnd++;
      // shade 0 is no ink, so there is nothing to draw
      if (shade > 0) stripsPerShade[shade - 1].push(`M${x} ${y}h${runEnd - x}v1h${x - runEnd}z`);
      x = runEnd;
    }
  }

  return stripsPerShade
    .map((strips, index) => {
      if (strips.length === 0) return '';
      const opacity = ((index + 1) / SVG_INK_LEVELS).toFixed(3);
      return `<path fill="${colorText}" fill-opacity="${opacity}" d="${strips.join('')}"/>`;
    })
    .filter((path) => path !== '');
}

function drawGridLines() {
  const { cellWidth, cellHeight } = cellSize();
  const { r, g, b } = guideStyle.gridLineColor;
  noFill();
  stroke(r, g, b, guideStyle.gridLineOpacity);
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
    stroke(r, g, b, guideStyle.polygonOpacity);
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
    fill(r, g, b);
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
    fill(r, g, b);
    circle(x, y, guideStyle.anchorDotSize);
    return;
  }

  const { cellWidth, cellHeight } = cellSize();
  // a see-through fill, so overlapping shapes and the curve still show
  fill(r, g, b, guideStyle.cellShapeOpacity);
  stroke(r, g, b);
  strokeWeight(1);
  drawCellShape((anchor.column + 0.5) * cellWidth, (anchor.row + 0.5) * cellHeight, cellWidth, cellHeight);
}

// Where the grid starts. It sits in the middle of the space between the
// library on the left and the control panel on the right. Hidden panels
// (g key) are 0 wide, so the grid moves back to the middle of the window.
function gridLeft() {
  const leftSide = library ? library.element.offsetWidth : 0;
  const rightSide = panel ? panel.domElement.offsetWidth : 0;
  return leftSide + (width - leftSide - rightSide - gridSize) / 2;
}

function gridTop() {
  return (height - gridSize) / 2;
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
  let closestDistance = GRAB_RADIUS;
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
  if (!dragging.moved && dist(mouseX, mouseY, dragging.startX, dragging.startY) < DRAG_THRESHOLD) return;
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
    // same as the "Randomize All" button: grid, anchors, spline, colors, drift and speed
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
    // src/lib/gui.js hides the control panel on g; the library and the
    // title above the grid go with it
    library.toggle();
    stageTitle.hidden = !stageTitle.hidden;
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
  if (playbackControls) playbackControls.showPaused(paused);
}

function togglePause() {
  setPaused(!animationPaused);
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

// The Colors arrows: three new colors. Main and Background are picked again
// until they differ enough, so the drawing stays visible.
function randomizeColors() {
  let mainColor;
  let backgroundChoice;
  do {
    mainColor = randomColor();
    backgroundChoice = randomColor();
  } while (colorDistance(mainColor, backgroundChoice) < MIN_COLOR_CONTRAST);
  uiParams.foregroundColor = mainColor;
  uiParams.backgroundColor = backgroundChoice;
  uiParams.accentColor = randomColor();
  // also recolors the panel in the new accent
  refreshPanel();
}

// Random values for the Drift and Speed sliders in the Drift folder.
function randomizeDrift() {
  uiParams.driftReach = randomSliderValue(driftReachRange);
  uiParams.speed = randomSliderValue(speedRange);
  refreshPanel();
}

// "Randomize All": grid, anchors, spline, colors, drift and speed at once.
// The mode and the text stay as they are.
function randomizeAll() {
  randomizeGrid();
  randomizeSpline();
  randomizeColors();
  randomizeDrift();
}

// Puts everything back the way the sketch opens: every value in the panel,
// the colors and the guides, with fresh anchors and a running animation.
// Only the mode and the view (Single or Multiple) stay: in 'Glyph' the anchors come from the (reset) text, in
// 'Shape' and 'Animation' they are new random ones.
function resetEverything() {
  const { anchorMode: mode, viewMode, iterationsPerRow } = uiParams;
  for (const [settingName, value] of Object.entries(startingParams)) {
    uiParams[settingName] = structuredClone(value);
  }
  uiParams.anchorMode = mode;
  // the view stays too: Single stays Single, Multiple keeps its size
  uiParams.viewMode = viewMode;
  uiParams.iterationsPerRow = iterationsPerRow;
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
  // that only changes what the controls show, so the panel's accent color
  // is set again here as well
  colorPanelInAccent(panel, uiParams.accentColor);
  // the switches and the Style field are this project's own, so they are told too
  for (const control of [anchorModeController, viewModeController, paintModeController, textureController]) {
    control.updateDisplay();
  }
  updateGuideControls();
  showWidthSlider();
  showModeControls();
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
// { settings, iterations }, with every iteration's anchors, nudges, noise,
// loop step and ink. Loading it brings the sheet back in Multiple view.
function captureVariation() {
  // Everything is collected in draw(), at the next frame, right after the
  // ink is drawn: then the saved state and the pictures match exactly.
  return new Promise((resolve) => {
    saveWaiting = () => resolve(isMultipleView() ? currentSheet() : currentDrawing());
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
// picture is cut out of the canvas like a single drawing's. It has no
// guides, so its preview shows no Grid and Anchors buttons.
function currentSheet() {
  const { showGrid, showAnchors, ...settings } = structuredClone(uiParams);
  const data = {
    settings,
    iterations: iterations.map((iteration) => ({
      anchors: iteration.anchors.map((anchor) => ({ ...anchor })),
      nudges: { ...iteration.nudges },
      noiseSeed: iteration.noiseSeed,
      loopStep: iteration.loopStep,
      inkPicture: inkToPicture(iteration.ink),
    })),
  };
  const svg = new Blob([sheetSVG().join('\n')], { type: 'image/svg+xml' });
  return { data, picture: drawingPicture(), svg };
}

// Multiple view: the whole sheet as one SVG file. Every iteration's own SVG
// file is placed in its spot, shrunk to fit: its width and height (the
// first line) are swapped for its position and size on the sheet.
function sheetSVG() {
  const shapes = [`<rect width="${gridSize}" height="${gridSize}" fill="${svgColor(uiParams.backgroundColor)}"/>`];
  iterations.forEach((iteration, index) => {
    withIteration(iteration, () => {
      const { x, y, size } = iterationPlace(index);
      const file = drawingSVG();
      const place = `x="${round(x, SVG_DECIMALS)}" y="${round(y, SVG_DECIMALS)}" width="${round(size, SVG_DECIMALS)}" height="${round(size, SVG_DECIMALS)}"`;
      file[0] = file[0].replace(/width="[^"]*" height="[^"]*"/, place);
      shapes.push(...file);
    });
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${gridSize}" height="${gridSize}" viewBox="0 0 ${gridSize} ${gridSize}">`,
    ...shapes,
    '</svg>',
  ];
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
    background(uiParams.backgroundColor.r, uiParams.backgroundColor.g, uiParams.backgroundColor.b);
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
      ink: new Float32Array(gridSize * gridSize),
      anchors: saved.anchors.map((anchor) => ({ ...anchor })),
      nudges: { ...saved.nudges },
      noiseSeed: saved.noiseSeed,
      loopStep: saved.loopStep,
    };
    pictureToInk(saved.inkPicture, iteration.ink);
    return iteration;
  });
  anchors = savedIterations[0].anchors.map((anchor) => ({ ...anchor }));
  setPaused(true);
  refreshPanel();
}

// An empty canvas the size of the grid, off screen, for turning the ink
// layer into a picture and back. Returns its drawing context; the canvas
// itself is context.canvas.
function gridSizedContext() {
  const pictureCanvas = document.createElement('canvas');
  pictureCanvas.width = gridSize;
  pictureCanvas.height = gridSize;
  return pictureCanvas.getContext('2d');
}

// An ink layer as a PNG picture, written as text (a "data URL"). Each
// pixel keeps its ink in its opacity: 0 for no ink, 255 for full. Without
// `source` it is the sketch's own ink layer.
function inkToPicture(source = ink) {
  const context = gridSizedContext();
  const pixelData = context.createImageData(gridSize, gridSize);
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
    const context = gridSizedContext();
    context.drawImage(picture, 0, 0);
    const pixelData = context.getImageData(0, 0, gridSize, gridSize).data;
    for (let index = 0; index < target.length; index++) {
      target[index] = pixelData[index * 4 + 3] / 255;
    }
  };
  picture.src = inkPicture;
}

// The picture the library shows and exports as PNG, as a data URL. It is
// cut out of the canvas where the grid is, at the canvas's full sharpness.
// pixelDensity() is 2 on most laptop screens: the canvas then has twice as
// many pixels as it looks, so the picture is twice the grid's size.
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
  resizeCanvas(windowWidth, windowHeight);
};

// This template's controls, added below the shared ones from src/lib/gui.js.
function addControls(gui, { moveTextControlsTo, moveColorControlsTo }) {
  // the first folder, so the mode is chosen before anything else. It always
  // stays open: its title is only a headline (see .lil-always-open in
  // index.html), and the T key leaves it alone.
  const modes = gui.addFolder('Modes');
  modes.domElement.classList.add('lil-always-open');
  // the Tab key skips its title, so Enter can't fold it away either
  modes.$title.tabIndex = -1;
  anchorModeController = addSwitch(modes, uiParams, 'anchorMode', ['Glyph', 'Shape', 'Animation'], (mode) => {
    swapAnchorCount(mode);
    showModeControls();
    if (mode === 'Glyph') updateFontAnchors();
    else randomAnchors();
  });
  // one drawing in the middle, or several iterations at once. Switching
  // starts the drawing over.
  viewModeController = addSwitch(modes, uiParams, 'viewMode', ['Single', 'Multiple'], () => {
    showModeControls();
    restartDrawing();
  });
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
  paintModeController = addSwitch(splinesFolder, uiParams, 'paintMode', ['Line', 'Fill'], restartDrawing);
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

  // Main, Accent and Background are made by src/lib/gui.js, and moved here
  const colors = gui.addFolder('Colors');
  addRandomizeIcon(colors, randomizeColors);
  moveColorControlsTo(colors);

  const driftFolder = gui.addFolder('Drift');
  addRandomizeIcon(driftFolder, randomizeDrift);
  driftFolder.add(uiParams, 'driftReach', driftReachRange.min, driftReachRange.max, driftReachRange.step).name('Drift');
  driftFolder.add(uiParams, 'speed', speedRange.min, speedRange.max, speedRange.step).name('Speed');


  // the Playback headline at the end, with Restart and Play/Pause on it
  playbackControls = addPlaybackSection(gui);

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

// The Controls headline in the panel, below the mode switch and above the
// Grid folder, styled like the panel's own headline. Below it, Randomize All
// and Reset All side by side. lil-gui has no headlines of its own, so these
// are plain page elements, added in the panel where the folders go. Their
// look is in index.html, under "the Controls headline".
function addControlsSection(gui) {
  const heading = document.createElement('div');
  heading.className = 'panel-section-title';
  heading.textContent = 'Controls';

  const actions = document.createElement('div');
  actions.className = 'panel-section-actions';
  const buttons = [
    ['Randomize All', randomizeAll],
    ['Reset All', resetEverything],
  ];
  for (const [label, action] of buttons) {
    const button = document.createElement('button');
    button.textContent = label;
    button.addEventListener('click', () => action());
    actions.appendChild(button);
  }
  gui.$children.append(heading, actions);
}

// The Playback icons: line drawings in the text color, 14 pixels wide, like
// the icons in the panel and the library.
// Restart: an arrow turning back on itself.
const RESTART_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
// Pause: two upright bars. Shown while the drawing runs.
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
// Play: a triangle pointing right. Shown while the drawing is paused.
const PLAY_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5 3 19 12 5 21 5 3"/></svg>`;

// The Playback headline at the end of the panel, styled like Controls, with
// Restart and Play/Pause as icons on its right. It gives back
// showPaused(paused), which swaps the Play/Pause icon; setPaused() calls it.
function addPlaybackSection(gui) {
  const heading = document.createElement('div');
  heading.className = 'panel-section-title';
  heading.append('Playback');

  // `label` shows when the mouse rests on a button, and screen readers read it
  const makeIconButton = (icon, label, action) => {
    const button = document.createElement('button');
    button.className = 'panel-icon-button';
    button.innerHTML = icon;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => action());
    return button;
  };
  const restartButton = makeIconButton(RESTART_ICON, 'Restart', restartDrawing);
  const pauseButton = makeIconButton(PAUSE_ICON, 'Pause', togglePause);
  const icons = document.createElement('div');
  icons.className = 'panel-section-icons';
  icons.append(restartButton, pauseButton);
  heading.appendChild(icons);
  gui.$children.appendChild(heading);

  // while the drawing runs, the button offers to pause it; while it is
  // paused, to play it again
  const showPaused = (paused) => {
    const label = paused ? 'Play' : 'Pause';
    pauseButton.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
    pauseButton.title = label;
    pauseButton.setAttribute('aria-label', label);
  };
  showPaused(animationPaused);
  return { showPaused };
}

// The title bar at the top of the middle, between the library and the
// control panel, in the style of the Library title. Its text is
// projectTitle from src/config.js; its look is in index.html, under "the
// title above the grid".
function createStageTitle() {
  const title = document.createElement('div');
  title.className = 'stage-title';
  title.textContent = projectTitle;
  document.body.appendChild(title);
  return title;
}

// The panels size themselves around the grid (see --panel-width in
// index.html), so they are told how big the grid is.
document.documentElement.style.setProperty('--grid-size', `${gridSize}px`);

// Builds the control panel and the library, then starts p5. p5 looks for
// the setup() and draw() you defined above and runs them.
library = createLibrary({ capture: captureVariation, apply: applyVariation });
stageTitle = createStageTitle();
panel = createGUI({
  params: uiParams,
  // the headline at the top of the panel, above the mode switch
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
// the Controls title is only a headline (see index.html), so the Tab key
// skips it and Enter can't fold the panel away
panel.$title.tabIndex = -1;
new p5();
