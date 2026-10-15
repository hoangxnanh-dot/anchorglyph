// TRACING PIXELS INTO OUTLINES
//
// Turns a picture made of pixels into smooth outlines, for SVG files that
// stay sharp in Illustrator at any zoom. Like the contour lines on a map:
// everything at least as bright as a threshold lies inside an outline,
// everything else outside. Several thresholds give several sets of outlines,
// one inside the other, like the rings of a hill.
//
//   const outlinesPerThreshold = traceOutlines(values, size, [0.25, 0.5, 0.75]);
//   const pathData = outlinesToPathData(outlinesPerThreshold[0], 1, 0.5);
//
// `values` holds one number per pixel, row by row, `size` pixels wide and
// tall (like the sketch's ink layer: 0 = empty, 1 = full). `thresholds` go
// from low to high. It gives back one list of outlines per threshold; each
// outline is a list of [x, y] points that closes on itself. Holes are
// outlines too: fill with fill-rule="evenodd" and they stay empty.
//
// How it works ("marching squares"): the picture is read in squares of four
// neighbouring pixels. Where an outline passes between two pixels, its point
// is placed in between them, as far towards one or the other as their
// brightness says. That is what makes the edges smooth instead of stepped.
//
// The loops below run millions of times for one drawing, so they use
// JavaScript's own Math.min, Math.max and Math.floor instead of p5's min(),
// max() and floor(): p5 checks every call for mistakes, which makes them
// thousands of times slower here.

// Which sides of a square the outline crosses, for each of the 16 ways its
// four corners can be inside or outside. The corners count as 8 (top left),
// 4 (top right), 2 (bottom right) and 1 (bottom left). Each pair is one
// piece of outline, from one side to the other. 5 and 10 have two opposite
// corners inside: those are decided by the middle of the square (SADDLES).
const PIECES = [
  [],
  [['left', 'bottom']],
  [['bottom', 'right']],
  [['left', 'right']],
  [['top', 'right']],
  null,
  [['top', 'bottom']],
  [['top', 'left']],
  [['top', 'left']],
  [['top', 'bottom']],
  null,
  [['top', 'right']],
  [['left', 'right']],
  [['bottom', 'right']],
  [['left', 'bottom']],
  [],
];
// If the middle of the square is inside, the two inside corners are joined
// and the two outside corners cut off; otherwise each inside corner gets a
// small piece of its own.
const SADDLES = {
  5: { middleInside: [['top', 'left'], ['bottom', 'right']], middleOutside: [['top', 'right'], ['left', 'bottom']] },
  10: { middleInside: [['top', 'right'], ['left', 'bottom']], middleOutside: [['top', 'left'], ['bottom', 'right']] },
};

const TOP_LEFT = 8;
const TOP_RIGHT = 4;
const BOTTOM_RIGHT = 2;
const BOTTOM_LEFT = 1;
const CORNERS_PER_SQUARE = 4;
// Every point where a square's side is crossed has two neighbours: the
// crossing before it and the one after it along the outline.
const NEIGHBOURS = 2;
const NO_NEIGHBOUR = -1;
// A pixel's value sits in its middle, half a pixel in from its corner.
const PIXEL_MIDDLE = 0.5;

export function traceOutlines(values, size, thresholds) {
  // A copy of the picture with one empty pixel all around it, so every
  // outline closes, also where the ink touches the edge. In the copy, pixel
  // (x, y) of the picture sits at (x + 1, y + 1).
  const width = size + 2;
  const padded = new Float32Array(width * width);
  for (let y = 0; y < size; y++) {
    padded.set(values.subarray(y * size, (y + 1) * size), (y + 1) * width + 1);
  }

  // The squares: square (x, y) has the padded pixels (x, y), (x + 1, y),
  // (x, y + 1) and (x + 1, y + 1) as its corners. The picture is read once,
  // and every square is noted for the thresholds that cross it: those
  // between its darkest and its brightest corner. Most squares are empty and
  // crossed by none, so each threshold only looks at a few of them.
  const squaresPerThreshold = thresholds.map(() => []);
  for (let y = 0; y < width - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const corner = y * width + x;
      const topLeft = padded[corner];
      const topRight = padded[corner + 1];
      const bottomLeft = padded[corner + width];
      const bottomRight = padded[corner + width + 1];
      const lowest = Math.min(topLeft, topRight, bottomLeft, bottomRight);
      const highest = Math.max(topLeft, topRight, bottomLeft, bottomRight);
      if (lowest === highest) continue;
      thresholds.forEach((threshold, index) => {
        if (lowest < threshold && threshold <= highest) squaresPerThreshold[index].push(corner);
      });
    }
  }

  // Every side of every square has a number, so the two squares that share
  // a side find the same crossing there: twice the number of the pixel at
  // its top or left end, plus 0 for a level side and 1 for an upright one.
  const sideCount = width * width * 2;
  const crossingX = new Float32Array(sideCount);
  const crossingY = new Float32Array(sideCount);
  const neighbours = new Int32Array(sideCount * NEIGHBOURS).fill(NO_NEIGHBOUR);
  const visited = new Uint8Array(sideCount);

  return thresholds.map((threshold, index) => {
    const crossedSides = [];

    // the point between two pixels where the brightness reaches the
    // threshold, as a share of the way from the first to the second
    const share = (first, second) => (threshold - first) / (second - first);

    for (const corner of squaresPerThreshold[index]) {
      const x = corner % width;
      const y = Math.floor(corner / width);
      const topLeft = padded[corner];
      const topRight = padded[corner + 1];
      const bottomLeft = padded[corner + width];
      const bottomRight = padded[corner + width + 1];
      const caseNumber = (topLeft >= threshold ? TOP_LEFT : 0)
        + (topRight >= threshold ? TOP_RIGHT : 0)
        + (bottomRight >= threshold ? BOTTOM_RIGHT : 0)
        + (bottomLeft >= threshold ? BOTTOM_LEFT : 0);
      const middle = (topLeft + topRight + bottomRight + bottomLeft) / CORNERS_PER_SQUARE;

      // A side's number and where it is crossed, in the picture's own
      // pixels. Padded pixel x is picture pixel x - 1, and its middle is
      // PIXEL_MIDDLE further on: at x - 1 + PIXEL_MIDDLE.
      const left = x - 1 + PIXEL_MIDDLE;
      const top = y - 1 + PIXEL_MIDDLE;
      const sides = {
        top: () => [corner * 2, left + share(topLeft, topRight), top],
        bottom: () => [(corner + width) * 2, left + share(bottomLeft, bottomRight), top + 1],
        left: () => [corner * 2 + 1, left, top + share(topLeft, bottomLeft)],
        right: () => [(corner + 1) * 2 + 1, left + 1, top + share(topRight, bottomRight)],
      };

      for (const [fromSide, toSide] of piecesInSquare(caseNumber, middle >= threshold)) {
        const from = noteCrossing(sides[fromSide]());
        const to = noteCrossing(sides[toSide]());
        connect(from, to);
        connect(to, from);
      }
    }

    // A crossing is noted the first time one of its two squares finds it.
    function noteCrossing([side, crossX, crossY]) {
      if (neighbours[side * NEIGHBOURS] === NO_NEIGHBOUR) {
        crossingX[side] = crossX;
        crossingY[side] = crossY;
        crossedSides.push(side);
      }
      return side;
    }

    function connect(side, otherSide) {
      const first = side * NEIGHBOURS;
      if (neighbours[first] === NO_NEIGHBOUR) neighbours[first] = otherSide;
      else neighbours[first + 1] = otherSide;
    }

    // Walks from crossing to crossing until it is back at the start: one
    // outline. Every crossing has exactly two neighbours, so it never forks.
    const outlines = [];
    for (const start of crossedSides) {
      if (visited[start]) continue;
      const outline = [];
      let previous = NO_NEIGHBOUR;
      let current = start;
      while (!visited[current]) {
        visited[current] = 1;
        outline.push([crossingX[current], crossingY[current]]);
        const first = neighbours[current * NEIGHBOURS];
        const next = first !== previous ? first : neighbours[current * NEIGHBOURS + 1];
        previous = current;
        current = next;
      }
      if (outline.length >= 3) outlines.push(outline);
    }

    // the next threshold starts with a clean slate
    for (const side of crossedSides) {
      neighbours[side * NEIGHBOURS] = NO_NEIGHBOUR;
      neighbours[side * NEIGHBOURS + 1] = NO_NEIGHBOUR;
      visited[side] = 0;
    }
    return outlines;
  });
}

// The pieces of outline in one square, see PIECES and SADDLES.
function piecesInSquare(caseNumber, isMiddleInside) {
  const saddle = SADDLES[caseNumber];
  if (!saddle) return PIECES[caseNumber];
  return isMiddleInside ? saddle.middleInside : saddle.middleOutside;
}

// Outlines as the text of an SVG <path>'s d="...", with positions
// multiplied by `scale` (0.5 halves the drawing) and rounded to `decimals`. Each outline starts at its first point (M) and then goes
// step by step to the next ones (l, measured from the point before), and
// closes (z). Short steps make short numbers, so the file stays small.
export function outlinesToPathData(outlines, decimals, scale = 1) {
  const factor = 10 ** decimals;
  // whole steps of the rounding, so adding the steps up never drifts away
  const units = (value) => Math.round(value * scale * factor);
  return outlines
    .map((outline) => {
      const points = outline.map(([x, y]) => [units(x), units(y)]);
      const [startX, startY] = points[0];
      const steps = [];
      for (let index = 1; index < points.length; index++) {
        const [x, y] = points[index];
        const [previousX, previousY] = points[index - 1];
        // a step that rounds to nothing is left out
        if (x === previousX && y === previousY) continue;
        steps.push(`${svgNumber(x - previousX, factor)} ${svgNumber(y - previousY, factor)}`);
      }
      // An outline smaller than the rounding shrinks to a point or a line:
      // too small to see, and an empty "l" would break the whole <path>.
      if (steps.length < 2) return '';
      return `M${svgNumber(startX, factor)} ${svgNumber(startY, factor)}l${steps.join(' ')}z`;
    })
    .join('');
}

// A number for an SVG file, as short as it gets: 0.5 is written .5, and
// -0.5 as -.5. `units` counts in 1 / `factor`.
function svgNumber(units, factor) {
  return String(units / factor).replace(/^(-?)0\./, '$1.');
}
