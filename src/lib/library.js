// THE LIBRARY
//
// The panel on the left. It keeps saved variations of the drawing, so you
// can come back to one later, change it, or use it as the starting point
// for a new one.
//
//   Save Iteration   adds what is on screen now to the top of the list: the
//   (or the s key)   drawing itself, the anchors and every setting
//   click a picture  opens a large preview. Escape, the x or a click beside
//                    the preview closes it again. Below the picture:
//                    Grid and Anchors show or hide the guides on the
//                    picture, Background shows or hides the background
//                    (a checkerboard shows where it is see-through), and
//                    PNG and SVG export it as you see it there. The field
//                    left of PNG sets how many pixels the PNG has.
//   Load (arrow to the right, bottom right of the picture)
//                    brings the variation back exactly as it was saved,
//                    paused. Space continues drawing from there.
//   Delete (x icon, right of the name)
//                    removes it right away, without asking first
//   the name         click it to type a new one
//   the checkbox     selects a variation. Shift-click a second checkbox to
//                    select everything in between.
//   Select all       selects every variation; once all are selected it
//                    turns into Deselect all, which clears the selection
//   Delete, PNG, SVG work on all selected variations at once
//
// Variations are kept for this page visit only: closing or reloading the
// page clears them. A saved drawing is a large picture, too large for the
// browser's long-term storage, so export the ones you want to keep.
//
// The sketch decides what a variation holds. It passes two functions:
//   capture()     gives back a Promise of { data, picture, svg, guides }:
//                 everything needed to rebuild the drawing, a full-size PNG
//                 picture of it (as a data URL), the drawing as an SVG file,
//                 and its guides: { grid, anchors, showGrid, showAnchors },
//                 the grid and the anchors as see-through SVG files (text) of
//                 the same size, and whether each was showing
//   apply(data)   rebuilds the drawing from that data
//
// The library gives back { element, toggle, save }. save() does what Save
// Iteration does; save(otherCapture) saves what otherCapture() gives back
// instead, with the same flash and slide.
//
//   const library = createLibrary({ capture, apply });
//
// The look of the panel is in index.html, under "the library".

import { screenshotName, variationName, variationDigits, gridSize } from '../config.js';
import { saveToDownloads, timestamp } from './export.js';
import { makeButton, makeIconButton, createProjectName } from './gui.js';
import { ARROW_ICON, CLOSE_ICON, SAVE_ICON, IMAGE_ICON, FILE_ICON, ANCHOR_ICON, BACKGROUND_ICON, dotGridIcon } from './icons.js';

// Saving shows a short flash in the accent color over the drawing, like a
// camera, and the new card slides down into the list from above while the
// cards below it make room.
// How bright the flash starts (0 = invisible, 1 = solid color) and how long
// it takes to fade, in milliseconds.
const FLASH_OPACITY = 0.7;
const FLASH_DURATION = 400;
// How long the cards take to slide into place, in milliseconds.
const SLIDE_DURATION = 700;
// The easing of the slide, as CSS writes it: fast at first, then slowing
// down gently until it lands ("ease out quint", see https://easings.net).
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// The text in the library while nothing is saved: what the tool does and
// how to start. One paragraph per line.
const INTRO_PARAGRAPHS = [
  'Start with type or click the grid to add points and drag to move them. Click a point to remove it.',
  'Experiment with options in Controls. Generations can be saved in Library.',
];

// The keyboard shortcuts listed below the intro, as key and what it does.
// The keys themselves are handled in src/sketch.js (keydown) and
// src/lib/gui.js (G and H): change this list when you change those.
const SHORTCUTS = [
  { key: 'Space', action: 'Pause / Play' },
  { key: 'S', action: 'Save Iteration' },
  { key: 'R', action: 'Randomize All' },
  { key: 'C', action: 'Reset All' },
  { key: '← / →', action: 'New random anchors' },
  { key: 'T', action: 'Open / close folders' },
  { key: 'H', action: 'Hide guides' },
  { key: 'G', action: 'Hide UI' },
];

// The sizes the preview's PNG export offers, in pixels wide and tall (a
// slanted grid makes the picture a little wider). `starting` is the one
// picked when the page opens.
const PNG_RESOLUTIONS = [
  { name: 'Low', size: 800 },
  { name: 'Mid', size: 1600 },
  { name: 'High', size: 2400, starting: true },
  { name: 'MAXX', size: 5000 },
];

// How many dots across and down the project's mark at the bottom of the
// library has, and how wide it is in pixels.
const FOOTER_MARK_DOTS = 3;
const FOOTER_MARK_SIZE = 40;

export function createLibrary({ capture, apply }) {
  // Earlier versions kept the library in the browser's storage. That space
  // is freed here, since nothing reads it anymore.
  try {
    localStorage.removeItem(`${screenshotName}-library`);
  } catch {
    // the browser doesn't allow storage (some private windows): nothing to free
  }

  // newest first. Each one: { id, name, data, picture, svg }
  let variations = [];
  // the ids of the variations whose checkbox is ticked
  const selectedIds = new Set();
  // the checkbox clicked last. A shift-click selects from here to there.
  let selectionStartId = null;
  // the variation loaded or saved last, outlined in the list
  let activeId = null;

  const panel = document.createElement('aside');
  panel.className = 'library';

  const title = document.createElement('div');
  title.className = 'library-title';
  title.textContent = 'Library';

  const saveButton = makeButton('Save Iteration', saveCurrent, SAVE_ICON);
  saveButton.classList.add('library-save');

  // one button for both: Select all, or Deselect all once everything is
  // selected. It only does something when there is at least one variation.
  const selectToggleButton = makeButton('Select all', toggleSelectAll);
  const selectionActions = document.createElement('div');
  selectionActions.className = 'library-selection-actions';
  selectionActions.append(selectToggleButton);

  // these only do something when at least one variation is selected
  const deleteSelectedButton = makeButton('Delete', deleteSelected);
  const exportPNGButton = makeButton('PNG', () => exportSelected('png'));
  const exportSVGButton = makeButton('SVG', () => exportSelected('svg'));
  const selectedActions = document.createElement('div');
  selectedActions.className = 'library-selection-actions';
  selectedActions.append(deleteSelectedButton, exportPNGButton, exportSVGButton);

  // a thin line between the buttons and the saved variations
  const divider = document.createElement('hr');
  divider.className = 'library-divider';

  // shows while nothing is saved: a short line, and a hint below it
  const emptyMessage = document.createElement('div');
  emptyMessage.className = 'library-empty';
  const emptyTitle = document.createElement('p');
  emptyTitle.className = 'library-empty-title';
  emptyTitle.textContent = 'Nothing saved yet.';
  const emptyHint = document.createElement('p');
  emptyHint.className = 'library-empty-hint';
  emptyHint.textContent = '»Save Iteration« keeps the drawing for this visit only.';

  // what the tool does, and how to start
  const intro = document.createElement('div');
  intro.className = 'library-intro';
  for (const paragraph of INTRO_PARAGRAPHS) {
    const line = document.createElement('p');
    line.textContent = paragraph;
    intro.appendChild(line);
  }

  // the shortcuts, one per line: Key — what it does
  const shortcutList = document.createElement('ul');
  shortcutList.className = 'library-shortcuts';
  for (const { key, action } of SHORTCUTS) {
    const row = document.createElement('li');
    row.textContent = `${key} — ${action}`;
    shortcutList.appendChild(row);
  }

  emptyMessage.append(emptyTitle, emptyHint, intro, shortcutList);

  const list = document.createElement('ul');
  list.className = 'library-list';

  // the project's mark, name and subtitle at the bottom of the library
  const footer = document.createElement('div');
  footer.className = 'library-footer';
  footer.innerHTML = dotGridIcon(FOOTER_MARK_DOTS, FOOTER_MARK_SIZE);
  footer.appendChild(createProjectName('library-project-name'));

  panel.append(title, saveButton, selectionActions, selectedActions, divider, emptyMessage, list, footer);
  document.body.appendChild(panel);

  // the white layer for the flash. It covers the drawing but sits below the
  // two panels, and clicks go straight through it.
  const flash = document.createElement('div');
  flash.className = 'library-flash';
  document.body.appendChild(flash);

  // the large preview, on top of everything
  const preview = document.createElement('div');
  preview.className = 'library-preview';
  preview.hidden = true;
  preview.setAttribute('role', 'dialog');
  preview.setAttribute('aria-modal', 'true');

  const previewContent = document.createElement('div');
  previewContent.className = 'library-preview-content';

  const previewHeader = document.createElement('div');
  previewHeader.className = 'library-preview-header';

  const previewName = document.createElement('div');
  previewName.className = 'library-preview-name';

  const closePreviewButton = makeIconButton(CLOSE_ICON, 'Close', closePreview);

  // a thin frame around the picture, with a label above it on each side:
  // the variation's mode on the left, the drawing's size on the right
  const previewFrame = document.createElement('div');
  previewFrame.className = 'library-preview-frame';
  const previewLabels = document.createElement('div');
  previewLabels.className = 'library-preview-labels';
  const previewModeLabel = document.createElement('span');
  const previewSizeLabel = document.createElement('span');
  previewSizeLabel.textContent = `${gridSize} × ${gridSize}`;
  previewLabels.append(previewModeLabel, previewSizeLabel);

  // the picture, with the grid and the anchors as see-through layers on top
  const previewStage = document.createElement('div');
  previewStage.className = 'library-preview-stage';
  const previewImage = document.createElement('img');
  previewImage.className = 'library-preview-image';
  const gridLayer = document.createElement('img');
  gridLayer.className = 'library-preview-layer';
  const anchorsLayer = document.createElement('img');
  anchorsLayer.className = 'library-preview-layer';
  previewStage.append(previewImage, gridLayer, anchorsLayer);

  // the buttons below the picture: the two guides and the background on
  // the left, the exports on the right
  const gridToggle = makeButton('Grid', () => toggleLayer('showGrid'), dotGridIcon());
  const anchorsToggle = makeButton('Anchors', () => toggleLayer('showAnchors'), ANCHOR_ICON);
  const backgroundToggle = makeButton('Background', () => toggleLayer('showBackground'), BACKGROUND_ICON);
  const guideButtons = document.createElement('div');
  guideButtons.className = 'library-preview-buttons';
  guideButtons.append(gridToggle, anchorsToggle, backgroundToggle);
  // how many pixels the PNG gets. It stays as you set it from one preview
  // to the next.
  const resolutionField = document.createElement('select');
  resolutionField.className = 'ui-button library-preview-resolution';
  resolutionField.title = 'PNG resolution';
  // only the names show; the pixels appear when the mouse rests on one
  for (const { name, size, starting } of PNG_RESOLUTIONS) {
    const option = new Option(name, size, starting, starting);
    option.title = `${size} × ${size} pixels`;
    resolutionField.add(option);
  }
  const exportButtons = document.createElement('div');
  exportButtons.className = 'library-preview-buttons';
  exportButtons.append(
    resolutionField,
    makeButton('PNG', () => exportPreview('png'), IMAGE_ICON),
    makeButton('SVG', () => exportPreview('svg'), FILE_ICON),
  );
  const previewFooter = document.createElement('div');
  previewFooter.className = 'library-preview-footer';
  previewFooter.append(guideButtons, exportButtons);

  // the variation in the preview, which guides show on it, and whether
  // its background does. Background stays as you set it from one preview
  // to the next.
  let previewVariation = null;
  const previewLayers = { showGrid: false, showAnchors: false, showBackground: true };

  previewFrame.append(previewLabels, previewStage);
  previewHeader.append(previewName, closePreviewButton);
  previewContent.append(previewHeader, previewFrame, previewFooter);
  preview.append(previewContent);
  document.body.appendChild(preview);

  // a click on the dark space around the picture closes the preview;
  // a click on the picture itself doesn't
  preview.addEventListener('click', closePreview);
  previewContent.addEventListener('click', (event) => event.stopPropagation());

  // While the preview is open, keys belong to it: Escape closes it, and no
  // key reaches the sketch, so Space doesn't pause the drawing behind it.
  // `true` hears every key before the sketch and the control panel do.
  window.addEventListener('keydown', (event) => {
    if (preview.hidden) return;
    event.stopPropagation();
    if (event.key === 'Escape') closePreview();
  }, true);

  showList();

  // `captureWith` is capture() unless the sketch passes another function
  // that gives back the same kind of Promise, like one that saves only a
  // part of what is on screen.
  async function saveCurrent(captureWith = capture) {
    showFlash();
    const { data, picture, svg, guides } = await captureWith();
    const variation = { id: String(Date.now()), name: nextName(), data, picture, svg, guides };
    // where every card is before the new one arrives
    const placesBefore = cardPlaces();
    // newest at the top, where you look first
    variations.unshift(variation);
    activeId = variation.id;
    showList();
    slideCards(variation.id, placesBefore);
  }

  // The flash: the white layer appears at once and fades out.
  // animate() is the browser's own animation tool: it moves from the first
  // state in the list to the last over `duration`.
  function showFlash() {
    flash.animate([{ opacity: FLASH_OPACITY }, { opacity: 0 }], {
      duration: FLASH_DURATION,
      easing: 'ease-out',
    });
  }

  // How far down the window each card's top edge is, by variation id.
  function cardPlaces() {
    const places = new Map();
    for (const item of list.children) places.set(item.dataset.id, item.getBoundingClientRect().top);
    return places;
  }

  // The new card starts one card height above its place, see-through, and
  // slides down into it. The other cards were pushed down by the new one; each
  // starts where it was before and slides to its new place, so nothing jumps.
  // The list cuts off what sticks out above it, so the new card seems to come
  // out from under the buttons.
  function slideCards(newId, placesBefore) {
    for (const item of list.children) {
      const placeNow = item.getBoundingClientRect().top;
      let startOffset;
      let startOpacity = 1;
      if (item.dataset.id === newId) {
        startOffset = -item.offsetHeight;
        startOpacity = 0;
      } else if (placesBefore.has(item.dataset.id)) {
        startOffset = placesBefore.get(item.dataset.id) - placeNow;
      } else {
        continue;
      }
      item.animate(
        [
          { transform: `translateY(${startOffset}px)`, opacity: startOpacity },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: SLIDE_DURATION, easing: SLIDE_EASING },
      );
    }
  }

  function loadVariation(variation) {
    apply(variation.data);
    activeId = variation.id;
    showList();
  }

  // Deleting happens right away, without the browser asking first.
  function deleteVariation(variation) {
    removeVariations([variation]);
  }

  function deleteSelected() {
    const selected = selectedVariations();
    if (selected.length === 0) return;
    removeVariations(selected);
  }

  function removeVariations(toRemove) {
    variations = variations.filter((variation) => !toRemove.includes(variation));
    for (const { id } of toRemove) {
      selectedIds.delete(id);
      if (id === activeId) activeId = null;
      if (id === selectionStartId) selectionStartId = null;
    }
    showList();
  }

  // Every selected variation becomes a file in your Downloads folder, named
  // after the project, the variation and the time, like
  // "Anchorglyph-V-01-260921-1408-1.png". The browser may ask once whether
  // the page is allowed to download several files.
  function exportSelected(format) {
    selectedVariations().forEach((variation, index) => {
      saveToDownloads(format === 'png' ? variation.picture : variation.svg, exportFileName(variation, format, index + 1));
    });
  }

  // The name of an exported file. Only letters, digits, - and _ are kept
  // from the variation's name, so every computer accepts it.
  function exportFileName(variation, format, number) {
    const safeName = variation.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'variation';
    return `${screenshotName}-${safeName}-${timestamp()}-${number}.${format}`;
  }

  function openPreview(variation) {
    previewVariation = variation;
    previewName.textContent = variation.name;
    previewImage.alt = variation.name;
    // like "Glyph canvas", or "Glyph sheet" for a whole sheet of iterations
    const { anchorMode, viewMode } = variation.data.settings;
    previewModeLabel.textContent = `${anchorMode} ${viewMode === 'Multiple' ? 'sheet' : 'canvas'}`;

    // the guides start the way they were showing when it was saved.
    // Variations without guides get no Grid and Anchors buttons.
    const { guides } = variation;
    gridToggle.hidden = !guides;
    anchorsToggle.hidden = !guides;
    previewLayers.showGrid = Boolean(guides?.showGrid);
    previewLayers.showAnchors = Boolean(guides?.showAnchors);
    if (guides) {
      gridLayer.src = svgToPicture(guides.grid);
      anchorsLayer.src = svgToPicture(guides.anchors);
    }
    showPreviewLayers();

    preview.setAttribute('aria-label', `Preview of ${variation.name}`);
    preview.hidden = false;
    closePreviewButton.focus();
  }

  function closePreview() {
    preview.hidden = true;
  }

  // Grid and Anchors: show or hide that guide on the preview
  function toggleLayer(layerName) {
    previewLayers[layerName] = !previewLayers[layerName];
    showPreviewLayers();
  }

  // Shows the guides that are switched on, the picture with or without
  // its background, and lights up their buttons
  async function showPreviewLayers() {
    gridLayer.hidden = !previewLayers.showGrid;
    anchorsLayer.hidden = !previewLayers.showAnchors;
    gridToggle.classList.toggle('is-on', previewLayers.showGrid);
    anchorsToggle.classList.toggle('is-on', previewLayers.showAnchors);
    backgroundToggle.classList.toggle('is-on', previewLayers.showBackground);
    // the checkerboard behind a see-through picture, see index.html
    previewStage.classList.toggle('is-see-through', !previewLayers.showBackground);
    const variation = previewVariation;
    const picture = await previewPicture(variation);
    // the picture without background takes a moment to make: by then the
    // preview may show another variation
    if (variation === previewVariation) previewImage.src = picture;
  }

  // The drawing's picture as the preview shows it: the saved picture, or
  // while Background is off, the saved SVG without its background
  async function previewPicture(variation) {
    if (previewLayers.showBackground) return variation.picture;
    return svgToPicture(await previewSVGText(variation));
  }

  // The saved SVG's text, without its background while Background is off.
  // The sketch puts every background on a line of its own, marked
  // class="background", so those lines are simply left out.
  async function previewSVGText(variation) {
    const svgText = await variation.svg.text();
    if (previewLayers.showBackground) return svgText;
    return svgText.split('\n').filter((line) => !line.includes('class="background"')).join('\n');
  }

  // The guides that show in the preview right now, as SVG text
  function visibleGuides() {
    const { guides } = previewVariation;
    if (!guides) return [];
    const shown = [];
    if (previewLayers.showGrid) shown.push(guides.grid);
    if (previewLayers.showAnchors) shown.push(guides.anchors);
    return shown;
  }

  // PNG and SVG in the preview: the file looks like the preview, with or
  // without the background, and with the guides that are showing drawn on
  // top of the drawing.
  async function exportPreview(format) {
    const variation = previewVariation;
    const filename = exportFileName(variation, format, 1);

    // the guides' shapes go just before the drawing's closing </svg>. All
    // files are the same size, so the shapes land in the right place.
    // A guide's shapes sit between the end of its opening <svg ...> tag
    // (the first >) and its closing </svg>.
    const drawing = await previewSVGText(variation);
    const end = drawing.lastIndexOf('</svg>');
    const shapes = visibleGuides().map((guide) => guide.slice(guide.indexOf('>') + 1, guide.lastIndexOf('</svg>')));
    const combined = new Blob([drawing.slice(0, end) + shapes.join('\n') + drawing.slice(end)], { type: 'image/svg+xml' });

    if (format === 'svg') {
      saveToDownloads(combined, filename);
      return;
    }

    // PNG: the SVG painted onto a canvas as large as the resolution field
    // says. The SVG is made of outlines, so it stays sharp at any size,
    // also far larger than the screen. The browser takes a moment for the
    // largest sizes.
    const fileLink = URL.createObjectURL(combined);
    const picture = await loadPicture(fileLink);
    URL.revokeObjectURL(fileLink);
    const height = Number(resolutionField.value);
    // a slanted grid makes the file wider than tall
    const width = Math.round((height * picture.naturalWidth) / picture.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(picture, 0, 0, width, height);
    // toBlob copes with large pictures better than a data URL does
    canvas.toBlob((file) => saveToDownloads(file, filename), 'image/png');
  }

  // SVG text turned into a data URL, so an <img> can show it
  function svgToPicture(svgText) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  // A picture from a data URL, once the browser has unpacked it
  async function loadPicture(source) {
    const picture = new Image();
    picture.src = source;
    await picture.decode();
    return picture;
  }

  function selectedVariations() {
    return variations.filter(({ id }) => selectedIds.has(id));
  }

  function selectEverything() {
    for (const { id } of variations) selectedIds.add(id);
    selectionStartId = variations[0]?.id ?? null;
    updateSelectionDisplay();
  }

  function deselectAll() {
    selectedIds.clear();
    selectionStartId = null;
    updateSelectionDisplay();
  }

  function everythingSelected() {
    return variations.length > 0 && selectedIds.size === variations.length;
  }

  function toggleSelectAll() {
    if (everythingSelected()) deselectAll();
    else selectEverything();
  }

  // A plain click ticks or unticks one checkbox. A shift-click selects
  // every variation from the checkbox clicked before down to this one.
  function clickCheckbox(variation, checkbox, event) {
    const clickedIndex = variations.indexOf(variation);
    const startIndex = variations.findIndex(({ id }) => id === selectionStartId);

    if (event.shiftKey && startIndex >= 0) {
      const firstIndex = Math.min(startIndex, clickedIndex);
      const lastIndex = Math.max(startIndex, clickedIndex);
      selectedIds.clear();
      for (const { id } of variations.slice(firstIndex, lastIndex + 1)) selectedIds.add(id);
    } else {
      if (checkbox.checked) selectedIds.add(variation.id);
      else selectedIds.delete(variation.id);
      selectionStartId = variation.id;
    }
    updateSelectionDisplay();
  }

  // Ticks the checkboxes and highlights the pictures of the selected
  // variations, without building the list again.
  function updateSelectionDisplay() {
    list.querySelectorAll('.library-item').forEach((item, index) => {
      const selected = selectedIds.has(variations[index].id);
      item.classList.toggle('is-selected', selected);
      item.querySelector('.library-selection-checkbox').checked = selected;
    });
    const nothingSelected = selectedIds.size === 0;
    for (const button of [deleteSelectedButton, exportPNGButton, exportSVGButton]) {
      button.disabled = nothingSelected;
    }
    // the toggle says what a click will do next
    selectToggleButton.textContent = everythingSelected() ? 'Deselect all' : 'Select all';
  }

  // variationName from src/config.js and a number: one higher than the
  // highest number so far, so a deleted name isn't handed out twice.
  // Names that don't start with variationName (renamed ones) count as 0.
  function nextName() {
    const numbers = variations.map((variation) => {
      if (!variation.name.startsWith(variationName)) return 0;
      return Number(variation.name.slice(variationName.length)) || 0;
    });
    const number = Math.max(0, ...numbers) + 1;
    // padStart adds zeros in front until the number has variationDigits digits
    return `${variationName}${String(number).padStart(variationDigits, '0')}`;
  }

  // Builds the list again from `variations`. Simpler than changing single
  // items, and the list is short.
  function showList() {
    list.replaceChildren(...variations.map(makeItem));
    const isEmpty = variations.length === 0;
    emptyMessage.hidden = !isEmpty;
    // the buttons always show; with nothing saved, Select all is greyed
    // out, like Delete, PNG and SVG while nothing is selected
    selectToggleButton.disabled = isEmpty;
    updateSelectionDisplay();
  }

  function makeItem(variation) {
    const item = document.createElement('li');
    item.className = 'library-item';
    // so the slide after saving can tell the cards apart
    item.dataset.id = variation.id;
    if (variation.id === activeId) item.classList.add('is-active');

    // the picture, with the checkbox and Load in its corners
    const thumbnail = document.createElement('div');
    thumbnail.className = 'library-thumbnail';

    const picture = document.createElement('img');
    picture.src = variation.picture;
    picture.alt = variation.name;
    picture.title = 'Show larger';
    picture.addEventListener('click', () => openPreview(variation));

    // a see-through layer in the accent color over a selected picture
    const selectionMask = document.createElement('div');
    selectionMask.className = 'library-selection-mask';

    const checkbox = document.createElement('input');
    checkbox.className = 'library-selection-checkbox';
    checkbox.type = 'checkbox';
    checkbox.title = 'Select';
    checkbox.addEventListener('click', (event) => clickCheckbox(variation, checkbox, event));

    const loadButton = makeIconButton(ARROW_ICON, 'Load', () => loadVariation(variation));
    loadButton.classList.add('library-load');

    thumbnail.append(picture, selectionMask, checkbox, loadButton);

    // a text field, so renaming is just clicking and typing
    const name = document.createElement('input');
    name.type = 'text';
    name.value = variation.name;
    name.addEventListener('change', () => {
      variation.name = name.value.trim() || variation.name;
      name.value = variation.name;
    });
    name.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') name.blur();
    });

    // the name and Delete above the picture
    const deleteButton = makeIconButton(CLOSE_ICON, 'Delete', () => deleteVariation(variation));
    const header = document.createElement('div');
    header.className = 'library-item-header';
    header.append(name, deleteButton);

    item.append(header, thumbnail);
    return item;
  }

  // hiding the library, like the control panel, leaves a clean screen
  function toggle() {
    panel.hidden = !panel.hidden;
  }

  return { element: panel, toggle, save: saveCurrent };
}
