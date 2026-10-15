// FOLDING THE PANELS
//
// Two icons at the ends of the title bar fold the library (left) and the
// control panel (right) out of the window, and bring them back:
//
//   const panelButtons = createPanelButtons();
//   somewhere.append(panelButtons.library);
//   somewhere.append(panelButtons.controls);
//
// Whether a panel is folded is a class on the page: is-library-folded or
// is-controls-folded. The slide itself is in index.html, under "folded
// panels". The sketch keeps the grid in the middle of the room that is left
// (see gridLeft() in src/sketch.js).
//
// On a narrow window, like a phone or a tablet held upright, there is no
// room for the panels beside the drawing. There they lie over it instead,
// start folded, and only one is open at a time. While the window is narrow
// the page has the class is-narrow, and isNarrow() says so.

import { makeIconButton } from './gui.js';
import { LIBRARY_ICON, MENU_ICON } from './icons.js';

// Windows narrower than this, in pixels, count as narrow: phones, and
// tablets held upright. Windows taller than wide count as narrow too.
const NARROW_WIDTH = 1024;

// The two panels: the name the button shows when the mouse rests on it,
// its icon, and the class on the page while the panel is folded.
const PANELS = {
  library: { name: 'Library', icon: LIBRARY_ICON, foldedClass: 'is-library-folded' },
  controls: { name: 'Controls', icon: MENU_ICON, foldedClass: 'is-controls-folded' },
};

export function createPanelButtons() {
  const buttons = {};
  for (const [panelName, { name, icon }] of Object.entries(PANELS)) {
    buttons[panelName] = makeIconButton(icon, name, () => setOpen(panelName, !isOpen(panelName)));
    buttons[panelName].classList.add('top-bar-panel-button');
  }

  function isOpen(panelName) {
    return !document.body.classList.contains(PANELS[panelName].foldedClass);
  }

  function isNarrow() {
    return document.body.classList.contains('is-narrow');
  }

  function setOpen(panelName, open) {
    document.body.classList.toggle(PANELS[panelName].foldedClass, !open);
    // on a narrow window two open panels would cover the drawing (and each
    // other), so opening one folds the other
    if (open && isNarrow()) {
      for (const otherName of Object.keys(PANELS)) {
        if (otherName !== panelName) document.body.classList.add(PANELS[otherName].foldedClass);
      }
    }
    showState();
  }

  // Each button says what a click does next, and screen readers hear
  // whether its panel is open.
  function showState() {
    for (const [panelName, { name }] of Object.entries(PANELS)) {
      const open = isOpen(panelName);
      buttons[panelName].title = `${open ? 'Hide' : 'Show'} ${name}`;
      buttons[panelName].setAttribute('aria-expanded', String(open));
    }
  }

  // When the window turns narrow, both panels fold, so the drawing shows.
  // When it turns wide again, both open, as on a wide window at the start.
  // Resizing within narrow or within wide leaves them as they are.
  let wasNarrow = null;
  function fitWindow() {
    const narrow = window.innerWidth < NARROW_WIDTH || window.innerHeight > window.innerWidth;
    if (narrow === wasNarrow) return;
    wasNarrow = narrow;
    document.body.classList.toggle('is-narrow', narrow);
    for (const { foldedClass } of Object.values(PANELS)) document.body.classList.toggle(foldedClass, narrow);
    showState();
  }
  fitWindow();
  window.addEventListener('resize', fitWindow);

  return { library: buttons.library, controls: buttons.controls, isNarrow };
}
