# Anchorglyph

Project created by
Xuan Nam Anh Hoang
Quang Chien Nguyen

This project was created as part of a one-week project in the course »Generative Typografie«,
taught by Bernhard Hoffmann @HTW Berlin 2026.

Inspired by »SAND CREATURES« from Anders Hoff – inconvergent:
https://inconvergent.net/generative/sand-creatures/

Fineliner Spline Style code based on: https://github.com/inconvergent/sand-spline
Code translated and edited from Python to p5 with Claude Code

Other Curve Styles based of »Fifteen Lines« by Manohar Vanga (Sighack)
https://github.com/sighack/fifteen-lines

Grid Template provided by Bernhard Hoffmann

Concept

The tool generates random anchor points within a grid
and connects them using B-spline curves, creating abstract shapes
that continuously evolve. Anchor points can be added, moved,
or removed with a mouse click.

Text can also serve as a source for generating anchor points,
making it easy to explore experimental letterforms, shapes,
and figures in a wide range of variations.

---

# Generative Typography

The course explores how creative coding can be used to manipulate,
transform, and animate typography beyond traditional static layouts.

Through research into existing projects, tools, and algorithms, 
students discover the possibilities of generative design. Working in 
groups, they develop their own experimental typography tools using p5.js,
with a focus on visual exploration, iteration, and unexpected results.

AI-assisted coding supports the process while encouraging critical
reflection on its impact on creativity and design.

---

# Controls

Click a cell        Add an anchor there (it goes to the end of the order),
                    or remove the anchor that is already there.
Drag an anchor      Move it around the grid. When you let go, it jumps
                    to the centre of the cell you drop it in.
Click an anchor     (without dragging) remove it.
Single / Multiple   In the Modes section: one drawing in the middle, or
                    several iterations at once (Per Row sets how many).
                    The first one (top left) is always your drawing from
                    Single view. Every other iteration joins the anchors
                    in its own order and picks its own Drift and Speed;
                    the grid, the anchor positions, the style and the
                    colors stay yours.
                    In Multiple, a click on one iteration saves it to the
                    library; Save Iteration saves the whole sheet.
Double-click a name In the control panel: put that setting back to where
                    it started.

Randomize All       New grid, anchors, spline, colors, gradient, drift and
                    speed at once. In 'Glyph' it also types a new text of
                    1 to 3 characters.

Iterate             Keep the same cells, connect them in a new order.
Clear / Restore     Remove every anchor. In 'Glyph' it is called Restore
                    and brings back the anchors of the text instead.

Modes: Glyph | Shape | Animation
                    'Glyph' uses the anchor points of the text, read from the font file.
                    'Shape' uses the grid anchors above.
                    'Animation' is like 'Shape', but anchors, shapes and lines also grow and shrink.

Invert              The switch next to the Modes headline: light becomes
                    dark and dark becomes light, in the panels and in the

Shortcuts

Space – Pause / Play  
S – Save Iteration
R – Randomize All
C – Reset All
← / → – Iterate Anchors
T – Open / Close Controls
H – Hide Guides
G – Hide UI

---

## Annotations

Code in this project runs through a program called **Node**.

## p5 version 2

This project uses p5.js **version 2**. 

## Licences

Licences for the libraries used are in [LICENSES.md](LICENSES.md).