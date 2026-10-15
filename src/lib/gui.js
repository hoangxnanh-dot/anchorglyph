// THE CONTROL PANEL
// https://lil-gui.georgealways.com/
//
// The shared part of the panel: text, font, size, colors, export and hotkeys.
// Your own controls go in addControls() in src/sketch.js:
//   1. add the value to `uiParams`
//   2. add one line in addControls()
//
// lil-gui picks the kind of control from the value you give it:
//
//   gui.add(uiParams, 'speed', 0, 10, 0.1);     a number  -> slider from 0 to 10, stepping 0.1
//   gui.add(uiParams, 'showGrid');              true/false -> checkbox
//   gui.add(uiParams, 'words');                 text      -> text field
//   gui.add(uiParams, 'easing', easingNames);   a list    -> dropdown
//   gui.addColor(uiParams, 'accent', 255);                -> color picker
//
// Add .name('Label') when the property name is not what you want to read.
//
// Double-clicking a control's name puts it back to its starting value.
// Sliders glide there, and double-clicking a slider's handle does the same;
// everything else jumps.
//
// Hotkeys:
//   g  hide or show this panel
//   h  hide or show the helpers (grid and anchor points)

import GUI from 'lil-gui';
import { fontOptions } from './font/fonts.js';
import { savePNG } from './export.js';
import { Easings } from './easings.js';
import { EYE_OPEN_ICON, EYE_CLOSED_ICON, RANDOMIZE_ICON, dotGridIcon } from './icons.js';
import { projectTitle, projectSubtitle } from '../config.js';

// How long a slider takes to glide back to its starting value after a
// double-click on its name or its handle, in milliseconds.
const RESET_DURATION = 400;
// How close to a slider's handle a double-click has to land to count as on
// the handle, in pixels on either side. The handle itself is only 2 pixels
// wide, too thin to hit exactly.
const HANDLE_REACH = 6;
// How many dots across and down the project's mark next to its name has,
// and how wide it is in pixels (see createProjectFooter()).
const FOOTER_MARK_DOTS = 3;
const FOOTER_MARK_SIZE = 40;
// The range of the Size slider for the text, in pixels. Below 150 a letter
// shrinks into a few grid cells and stops reading as a letter; at 900 a
// single letter fills the grid (longer words fill it much earlier).
const TEXT_SIZE_RANGE = { min: 150, max: 900, step: 1 };

// `onFontChange` runs when someone picks a font from the dropdown. A shared
// control only appears when `params` has its value, so a template without
// text simply leaves `text`, `font` and `textSize` out.
export function createGUI({
  params,
  title = 'Controls',
  onTextChange = () => {},
  onTextSizeChange = () => {},
  onFontChange = () => {},
  addControls = () => {},
  exportSVG,
  exportPNG = true,
  onHelpersToggle = () => {},
}) {
  // the name at the very top of the panel
  const gui = new GUI({ title });

  // text, font and size, added to `container`: the panel itself or a folder
  const addTextControls = (container) => {
    const controllers = [];
    if ('text' in params) {
      const textController = container.add(params, 'text').name('Type here').onChange(onTextChange);
      selectAllOnFocus(textController.$input);
      controllers.push(textController);
    }
    if ('font' in params) controllers.push(container.add(params, 'font', fontOptions).onChange(onFontChange));
    if ('textSize' in params) controllers.push(container.add(params, 'textSize', TEXT_SIZE_RANGE.min, TEXT_SIZE_RANGE.max, TEXT_SIZE_RANGE.step).name('Size').onChange(onTextSizeChange));
    return controllers;
  };

  // they start at the top of the panel
  let textControllers = addTextControls(gui);

  // lil-gui can't move a control, so this removes them from where they are and
  // builds them again inside `folder`. addControls() in sketch.js can call it.
  const moveTextControlsTo = (folder) => {
    textControllers.forEach((controller) => controller.destroy());
    textControllers = addTextControls(folder);
    return textControllers;
  };

  const applyAccent = () => {
    if ('accentColor' in params) applyAccentColor(params.accentColor);
  };

  // the color pickers, added to `container`: the panel itself or a folder.
  // The 255 says our r, g and b channels run to 255, not to 1.
  const addColorControls = (container) => {
    const controllers = [];
    if ('foregroundColor' in params) controllers.push(container.addColor(params, 'foregroundColor', 255).name('Main'));
    if ('accentColor' in params) controllers.push(container.addColor(params, 'accentColor', 255).name('Accent').onChange(applyAccent));
    if ('backgroundColor' in params) controllers.push(container.addColor(params, 'backgroundColor', 255).name('Background'));
    return controllers;
  };

  // they also start at the top, and can be moved the same way as the text
  let colorControllers = addColorControls(gui);

  const moveColorControlsTo = (folder) => {
    colorControllers.forEach((controller) => controller.destroy());
    colorControllers = addColorControls(folder);
    return colorControllers;
  };

  addControls(gui, { moveTextControlsTo, moveColorControlsTo });

  // a function on an object is how lil-gui makes a button. Pass
  // exportPNG: false to leave it out.
  if (exportPNG) gui.add({ exportPNG: () => savePNG() }, 'exportPNG').name('Export PNG');

  // only sketches that know how to draw themselves as SVG pass exportSVG
  if (exportSVG) gui.add({ exportSVG }, 'exportSVG').name('Export SVG');

  // sliders show only the slider, without the number box on their right, and
  // color pickers only the color, without the hex code (like fafafa) next to
  // it. lil-gui still keeps the values; they just aren't shown.
  gui.controllersRecursive().forEach((controller) => {
    if (controller.$slider) controller.$input.style.display = 'none';
    if (controller.$text) controller.$text.style.display = 'none';
  });

  // double-clicking a control's name puts it back to the value it started
  // with. lil-gui remembers that value itself; reset() also runs the
  // control's onChange, so the sketch reacts as if you had moved it.
  // Sliders glide back; buttons have nothing to reset, so they are skipped.
  gui.controllersRecursive().forEach((controller) => {
    if (typeof controller.initialValue === 'function') return;
    controller.$name.title = 'Double-click to reset';
    controller.$name.addEventListener('dblclick', () => {
      if (controller.$slider) glideToStart(controller);
      else controller.reset();
    });

    // a slider's handle is the right edge of its colored fill ($fill).
    // Double-clicks elsewhere on the slider are left alone.
    if (controller.$slider) {
      controller.$slider.addEventListener('dblclick', (event) => {
        const handleX = controller.$fill.getBoundingClientRect().right;
        if (Math.abs(event.clientX - handleX) <= HANDLE_REACH) glideToStart(controller);
      });
    }
  });

  applyAccent();

  // hiding the panel leaves a clean canvas to screenshot or record
  let visible = true;
  const toggle = () => {
    visible = !visible;
    gui.show(visible);
  };

  // h hides the helpers: the grid and the anchor points. If either one is
  // showing, both are hidden; if both are hidden, both come back.
  // `params` is the uiParams object from sketch.js, so changing it here is
  // what the sketch sees in draw(). Templates without these values are skipped.
  const toggleHelpers = () => {
    const keys = ['showGrid', 'showAnchors'].filter((property) => property in params);
    if (keys.length === 0) return;
    const show = !keys.some((property) => params[property]);
    keys.forEach((property) => { params[property] = show; });
    // make the checkboxes in the panel match
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    // and anything the sketch built itself, like the eye icons
    onHelpersToggle();
  };

  window.addEventListener('keydown', (event) => {
    // without this, typing an s into the text field would save a screenshot
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.key === 'g') toggle();
    if (event.key === 'h') toggleHelpers();
  });

  return gui;
}

// Clicking into the field marks all of its text, so typing replaces it and
// you don't have to delete the old word first. The text stays until you type.
function selectAllOnFocus(input) {
  // Safari and Chrome place the cursor when the mouse button comes up, which
  // would undo the selection, so the first mouseup after focusing is skipped.
  // Later clicks place the cursor as usual, to fix a single letter.
  let justFocused = false;
  input.addEventListener('focus', () => {
    input.select();
    justFocused = true;
  });
  input.addEventListener('mouseup', (event) => {
    if (justFocused) event.preventDefault();
    justFocused = false;
  });
}

// Moves a slider back to its starting value over RESET_DURATION, a little
// further every frame, fast at first and slowing down as it arrives
// (cubicOut). The sketch follows along, as if you dragged the slider back.
function glideToStart(controller) {
  const from = controller.getValue();
  const startTime = performance.now();
  const glide = (now) => {
    const progress = Math.min(1, (now - startTime) / RESET_DURATION);
    if (progress === 1) {
      // the last step lands exactly on the starting value
      controller.reset();
      return;
    }
    const value = lerp(from, controller.initialValue, Easings.cubicOut(progress));
    // _snap() is lil-gui's own rounding to the slider's steps, so Columns
    // passes through 12 and 13, never 12.4
    controller.setValue(controller._snap(value));
    requestAnimationFrame(glide);
  };
  requestAnimationFrame(glide);
}

// The accent color also colors parts of the page: the selected cards in the
// library and the switched-on Grid and Anchors buttons of its preview. The
// panel itself stays black and grey, so it never fights with the drawing.
// The Accent picker calls this on every change; call it yourself after
// changing the accent in code.
export function applyAccentColor({ r, g, b }) {
  document.documentElement.style.setProperty('--accent-color', `rgb(${r}, ${g}, ${b})`);
}

// A button split into parts, one per option, like [ Shape | Glyph ]. The part
// that matches params[property] is lit up. lil-gui only has dropdowns for this, so
// the row is built here from lil-gui's own classes to look like the rest.
//
//   addSwitch(folder, uiParams, 'anchorMode', ['Shape', 'Glyph'], (mode) => { ... });
//
// The chosen part is black. A `secondary` switch is smaller and its chosen
// part only a darker grey, so the main switch above it stands out:
//
//   addSwitch(folder, uiParams, 'viewMode', ['Single', 'Multiple'], restart, { secondary: true });
//
// Its look is in index.html, under "the switches". Call updateDisplay() on
// what it returns after changing params[property] in code.
export function addSwitch(folder, params, property, options, onChange = () => {}, { secondary = false } = {}) {
  const row = document.createElement('div');
  row.classList.add('lil-controller', 'lil-switch');
  if (secondary) row.classList.add('is-secondary');
  const widget = document.createElement('div');
  widget.classList.add('lil-widget');
  row.appendChild(widget);

  const buttons = options.map((option) => {
    const button = document.createElement('button');
    button.textContent = option;
    button.addEventListener('click', () => {
      if (params[property] === option) return;
      params[property] = option;
      updateDisplay();
      onChange(option);
    });
    widget.appendChild(button);
    return button;
  });

  // the chosen part gets the class is-chosen, which index.html colors
  function updateDisplay() {
    buttons.forEach((button, index) => {
      button.classList.toggle('is-chosen', params[property] === options[index]);
    });
  }

  folder.$children.appendChild(row);
  updateDisplay();
  return { updateDisplay };
}

// A field that steps through a list of options instead of a dropdown. It
// shows the chosen option between two arrows, like  ‹ Fineliner › . A click
// on its left half goes to the option before, on its right half to the one
// after; past the last option it starts again at the first.
//
//   addCycler(folder, uiParams, 'texture', textureOptions, { name: 'Style', onChange: restartDrawing });
//
// `options` is a list (['dots', 'pen']) or, like lil-gui's dropdowns, an
// object of { 'Label shown': value }. Leave out `name` and the field takes
// the whole row, with no name in front. With a name, double-clicking it goes
// back to the starting option, like the other controls. Call updateDisplay()
// on what it returns after changing params[property] in code.
export function addCycler(folder, params, property, options, { name, onChange = () => {} } = {}) {
  const entries = Array.isArray(options) ? options.map((option) => [option, option]) : Object.entries(options);
  const labels = entries.map(([label]) => label);
  const values = entries.map(([, value]) => value);
  const startingValue = params[property];

  const row = document.createElement('div');
  row.classList.add('lil-controller');
  const widget = document.createElement('div');
  widget.classList.add('lil-widget');
  if (name) {
    const label = document.createElement('div');
    label.classList.add('lil-name');
    label.textContent = name;
    label.title = 'Double-click to reset';
    label.addEventListener('dblclick', () => choose(startingValue));
    row.appendChild(label);
  }
  row.appendChild(widget);

  // one button with the arrows at its edges and the option in the middle
  const button = document.createElement('button');
  button.style.display = 'flex';
  button.style.justifyContent = 'space-between';
  button.style.alignItems = 'center';
  const previousArrow = document.createElement('span');
  previousArrow.textContent = '‹';
  const shown = document.createElement('span');
  const nextArrow = document.createElement('span');
  nextArrow.textContent = '›';
  button.append(previousArrow, shown, nextArrow);
  widget.appendChild(button);

  function updateDisplay() {
    shown.textContent = labels[values.indexOf(params[property])] ?? params[property];
  }

  function choose(value) {
    if (params[property] === value) return;
    params[property] = value;
    updateDisplay();
    onChange(value);
  }

  button.addEventListener('click', (event) => {
    // which half of the button was clicked: left steps back, right forward
    const buttonBox = button.getBoundingClientRect();
    const direction = event.clientX < buttonBox.left + buttonBox.width / 2 ? -1 : 1;
    // the % wraps around, so after the last option comes the first again
    const index = (values.indexOf(params[property]) + direction + values.length) % values.length;
    choose(values[index]);
  });

  folder.$children.appendChild(row);
  updateDisplay();
  return { updateDisplay };
}

// The buttons around the panel, in the library and in its preview, all made
// the same way so they look the same: light grey with rounded corners (see
// "the buttons" in index.html).
//
//   makeButton('Save Iteration', saveCurrent, SAVE_ICON);   a word, an icon in front
//   makeIconButton(CLOSE_ICON, 'Close', closePreview);      only an icon
//
// `onClick` is called without anything passed to it.
export function makeButton(label, onClick, icon = '') {
  const button = document.createElement('button');
  button.className = 'ui-button';
  button.innerHTML = icon;
  button.append(label);
  button.addEventListener('click', () => onClick());
  return button;
}

// A button with only an icon. `label` shows when the mouse rests on it, and
// screen readers read it out.
export function makeIconButton(icon, label, onClick) {
  const button = makeButton('', onClick);
  setButtonIcon(button, icon, label);
  return button;
}

// Gives an icon button a new icon and label, like Play turning into Pause.
export function setButtonIcon(button, icon, label) {
  button.innerHTML = icon;
  button.title = label;
  button.setAttribute('aria-label', label);
}

// The project's mark, and next to it its name with the subtitle below, from
// src/config.js: at the bottom of the library and of the start screen, the
// same in both. `className` places it; the look is in index.html, under
// "the project's mark and name".
export function createProjectFooter(className) {
  const footer = document.createElement('div');
  footer.className = `project-footer ${className}`;
  footer.innerHTML = dotGridIcon(FOOTER_MARK_DOTS, FOOTER_MARK_SIZE);
  const text = document.createElement('div');
  text.className = 'project-footer-text';
  const name = document.createElement('div');
  name.textContent = projectTitle;
  const subtitle = document.createElement('div');
  subtitle.className = 'project-subtitle';
  subtitle.textContent = projectSubtitle;
  text.append(name, subtitle);
  footer.appendChild(text);
  return footer;
}

// A name with a small on/off switch next to it, like Invert:
//
//   const invert = createSwitchButton({ label: 'Invert', isOn: () => uiParams.invertColors, onClick: invertColors });
//   somewhere.appendChild(invert.element);
//
// `isOn()` says whether it is on right now; `onClick` runs when it is
// clicked, and should change what isOn() reads. Call updateDisplay() on what
// it gives back after that changed, to move the knob. `title` shows when the
// mouse rests on it. The look is in index.html, under "the switches".
export function createSwitchButton({ label, title = label, isOn, onClick }) {
  const button = document.createElement('button');
  button.className = 'switch-button';
  // screen readers announce it as a switch that is on or off
  button.setAttribute('role', 'switch');
  button.title = title;
  const name = document.createElement('span');
  name.textContent = label;
  const track = document.createElement('span');
  track.className = 'switch-track';
  button.append(name, track);
  button.addEventListener('click', onClick);

  const updateDisplay = () => button.setAttribute('aria-checked', String(isOn()));
  updateDisplay();
  return { element: button, updateDisplay };
}

// Small icons on the right of a folder's title, that work without opening
// the folder:
//
//   addEyeToggle(grid, uiParams, 'showGrid');        hides or shows something
//   addRandomizeIcon(spline, randomizeSpline);       runs a function, like a button
//
// They are line drawings from src/lib/icons.js, in the panel's text color.

// Adds one clickable icon to the row of icons on the right of the title.
// The row's look is in index.html, under "the folder icons".
function addTitleIcon(folder, onClick) {
  // the row is made once per folder, so several icons sit side by side
  if (!folder.$titleIcons) {
    const row = document.createElement('span');
    row.className = 'lil-title-icons';
    folder.$title.appendChild(row);
    folder.$titleIcons = row;
  }

  // the folder title is a <button>, and a button can't hold another button,
  // so the icon is a <span> that acts like one
  const icon = document.createElement('span');
  icon.className = 'lil-title-icon';
  icon.setAttribute('role', 'button');
  icon.addEventListener('click', (event) => {
    // without this, the click would also open or close the folder
    event.stopPropagation();
    onClick();
  });
  folder.$titleIcons.appendChild(icon);
  return icon;
}

// An eye that hides or shows something: params[property] is true or false.
// Call updateDisplay() on what it returns after changing params[property] in code.
export function addEyeToggle(folder, params, property, onChange = () => {}) {
  const icon = addTitleIcon(folder, () => {
    params[property] = !params[property];
    updateDisplay();
    onChange(params[property]);
  });

  // an open eye while it shows, a crossed-out, faded eye while it is hidden
  function updateDisplay() {
    icon.innerHTML = params[property] ? EYE_OPEN_ICON : EYE_CLOSED_ICON;
    icon.style.opacity = params[property] ? '1' : '0.4';
    icon.title = params[property] ? 'Hide' : 'Show';
  }

  updateDisplay();
  return { updateDisplay };
}

// Crossing arrows that run `randomize` when clicked, instead of a Randomize button
// inside the folder. Call show(false) or show(true) on what it returns to
// hide or show it.
export function addRandomizeIcon(folder, randomize) {
  const icon = addTitleIcon(folder, randomize);
  icon.innerHTML = RANDOMIZE_ICON;
  icon.title = 'Randomize';

  function show(visible = true) {
    icon.style.display = visible ? 'flex' : 'none';
  }

  return { show };
}

// A whole number with a box to type in and [-] [+] buttons on either side,
// instead of a slider:
//
//   addStepper(folder, uiParams, 'columns', { min: 1, max: 32, onChange: resizeGrid });
//
// Typed values are rounded and kept between min and max. Call
// updateDisplay() on what it returns after changing params[property] in code,
// and show(false) or show(true) to hide or show it.
export function addStepper(folder, params, property, { name = property, min: lowest, max: highest, onChange = () => {} }) {
  // lil-number gives the box lil-gui's blue number color
  const row = document.createElement('div');
  row.classList.add('lil-controller', 'lil-number');
  const label = document.createElement('div');
  label.classList.add('lil-name');
  label.textContent = name;
  const widget = document.createElement('div');
  widget.classList.add('lil-widget');
  widget.style.gap = 'var(--spacing)';
  row.append(label, widget);

  const makeButton = (buttonText) => {
    const button = document.createElement('button');
    button.textContent = buttonText;
    // square buttons, so the box in the middle gets the rest of the width
    button.style.width = 'var(--button-height)';
    button.style.flexShrink = '0';
    return button;
  };
  const minus = makeButton('−');
  const plus = makeButton('+');
  const input = document.createElement('input');
  input.type = 'text';
  // phones and tablets show a number keyboard
  input.inputMode = 'numeric';
  input.style.textAlign = 'center';
  widget.append(minus, input, plus);

  function updateDisplay() {
    input.value = params[property];
  }

  function setValue(value) {
    const kept = constrain(Math.round(value), lowest, highest);
    const changed = kept !== params[property];
    params[property] = kept;
    // shows the kept value, also when what was typed got rounded or limited
    updateDisplay();
    if (changed) onChange(kept);
  }

  minus.addEventListener('click', () => setValue(params[property] - 1));
  plus.addEventListener('click', () => setValue(params[property] + 1));

  // a typed number counts once you press Enter or click somewhere else.
  // Anything that isn't a number puts the old value back.
  input.addEventListener('change', () => {
    const typed = Number(input.value);
    if (input.value.trim() === '' || Number.isNaN(typed)) updateDisplay();
    else setValue(typed);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });

  // works like lil-gui's own show(): a hidden row takes up no room
  function show(visible = true) {
    row.style.display = visible ? '' : 'none';
  }

  folder.$children.appendChild(row);
  updateDisplay();
  return { updateDisplay, show };
}
