// THE START SCREEN
//
// What you see first: a big question on the left, over the drawing, and one
// card per mode on the right. Resting the mouse on a card (or reaching it
// with the Tab key) shows that mode in the drawing on the left. Clicking a
// card picks the mode: the start screen fades out, the panels fade in, and
// the drawing glides to its place in the middle. Clicking the project's name
// in the title bar brings the start screen back, the same way in reverse.
//
// On a narrow window (a phone) the cards sit below the drawing in a
// carousel that scrolls up and down, one card fully in view at a time. The
// card that comes to rest in the middle is shown in the drawing; tapping it
// picks the mode, tapping a half-hidden one brings it to the middle.
//
// The sketch decides what happens. It passes:
//   modes          the mode names, in the order of the cards
//   startingMode   the card that is lit up at first
//   onPreview(mode)  a card was pointed at: show this mode
//   onChoose(mode)   a card was clicked: go to the main screen in this mode
//   switches       on/off switches at the top of the cards, each one
//                  { label, title, isOn, onClick } (see createSwitchButton
//                  in src/lib/gui.js)
//
// It gives back { open, isOpen, updateSwitches }:
//   open(mode)        brings the start screen back, with the card of `mode`
//                     lit up
//   isOpen()          whether it is open, or on its way there
//   updateSwitches()  moves the switches' knobs after what they show changed
//
// Whether it is open is one class on the page, is-starting: the page opens
// with it (see index.html). While it is there, the start screen shows and
// the panels wait, invisible; the look is in index.html, under "the start
// screen".

import { ARROW_ICON } from './icons.js';
import { createSwitchButton, createProjectFooter } from './gui.js';

// How long the change to the main screen takes, in milliseconds. The sketch
// reads it too, so the drawing glides exactly as long as the fade.
export const START_TRANSITION_DURATION = 900;

// The question on the left. \n starts a new line.
const HEADLINE = 'What are you\ncreating today?';

export function createStartScreen({ modes, startingMode, onPreview, onChoose, switches = [] }) {
  const screen = document.createElement('section');
  screen.className = 'start-screen';
  // the fade's length, for index.html: the start screen and the panels use it
  document.documentElement.style.setProperty('--start-transition-duration', `${START_TRANSITION_DURATION}ms`);

  // the left part: see-through, so the drawing on the canvas shows. Clicks
  // go through it, but they are ignored while the start screen is open.
  const stage = document.createElement('div');
  stage.className = 'start-stage';
  const headline = document.createElement('h1');
  headline.className = 'start-headline';
  headline.textContent = HEADLINE;
  stage.append(headline, createProjectFooter('start-footer'));

  // the right part: one card per mode, numbered like "Mode // 01"
  const cardList = document.createElement('div');
  cardList.className = 'start-modes';
  const cards = modes.map((mode, index) => {
    const card = document.createElement('button');
    card.className = 'start-mode';
    const label = document.createElement('span');
    label.className = 'start-mode-label';
    // padStart gives the number a zero in front: 01, 02, 03. (p5's nf()
    // would too, but the start screen is built before p5 has started.)
    label.textContent = `Mode // ${String(index + 1).padStart(2, '0')}`;
    const name = document.createElement('span');
    name.className = 'start-mode-name';
    name.textContent = mode;
    const arrow = document.createElement('span');
    arrow.className = 'start-mode-arrow';
    arrow.innerHTML = ARROW_ICON;
    card.append(label, name, arrow);

    // on a narrow window the carousel decides what is on show, not the
    // mouse, so resting on a card there does nothing
    card.addEventListener('pointerenter', () => {
      if (!isNarrow()) preview(mode);
    });
    card.addEventListener('focus', () => {
      preview(mode);
      if (isNarrow()) scrollToCard(card, 'smooth');
    });
    // in the carousel, a click on a card cut off at the top or bottom brings
    // it to the middle first; a click on the one in the middle picks it
    card.addEventListener('click', () => {
      if (isNarrow() && card !== middleCard()) scrollToCard(card, 'smooth');
      else choose(mode);
    });
    return card;
  });
  // On a narrow window the cards sit in a carousel that scrolls up and down:
  // one card fully in view, with a slice of the ones above and below it.
  // On a wide window it steps aside (see index.html), and the cards are
  // stacked as before.
  const carousel = document.createElement('div');
  carousel.className = 'start-mode-carousel';
  carousel.append(...cards);
  // the card that comes to rest in the middle is shown in the drawing.
  // requestAnimationFrame checks once per frame, however often the
  // carousel reports that it scrolled.
  let scrollCheckPending = false;
  carousel.addEventListener('scroll', () => {
    if (scrollCheckPending) return;
    scrollCheckPending = true;
    requestAnimationFrame(() => {
      scrollCheckPending = false;
      const mode = modes[cards.indexOf(middleCard())];
      if (mode !== shownMode) preview(mode);
    });
  });
  // the switches, below each other above the cards
  const switchButtons = switches.map(createSwitchButton);
  const switchRow = document.createElement('div');
  switchRow.className = 'start-switches';
  switchRow.append(...switchButtons.map((switchButton) => switchButton.element));
  cardList.append(switchRow, carousel);

  screen.append(stage, cardList);
  document.body.appendChild(screen);

  // the mode on show in the drawing; its card is lit up
  let shownMode = startingMode;
  function lightUp(mode) {
    shownMode = mode;
    cards.forEach((card, index) => card.classList.toggle('is-active', modes[index] === mode));
  }

  // src/lib/panels.js decides whether the window is narrow
  function isNarrow() {
    return document.body.classList.contains('is-narrow');
  }

  // The card closest to the carousel's middle line
  function middleCard() {
    const middle = carousel.scrollTop + carousel.clientHeight / 2;
    let closest = cards[0];
    for (const card of cards) {
      const cardMiddle = card.offsetTop + card.offsetHeight / 2;
      const closestMiddle = closest.offsetTop + closest.offsetHeight / 2;
      if (Math.abs(cardMiddle - middle) < Math.abs(closestMiddle - middle)) closest = card;
    }
    return closest;
  }

  // Scrolls the carousel so `card` sits in its middle. `behavior` is
  // 'smooth' to glide there, or 'instant' to jump.
  function scrollToCard(card, behavior) {
    const top = card.offsetTop - (carousel.clientHeight - card.offsetHeight) / 2;
    carousel.scrollTo({ top, behavior });
  }

  // the lit-up card in the carousel's middle, without a glide
  function centerShownCard() {
    if (isNarrow()) scrollToCard(cards[modes.indexOf(shownMode)], 'instant');
  }

  function preview(mode) {
    lightUp(mode);
    onPreview(mode);
  }

  function isOpen() {
    return document.body.classList.contains('is-starting');
  }

  // Opens or closes it. A closed start screen stays on the page, faded out
  // and out of reach of the mouse, the Tab key and screen readers (inert),
  // until open() brings it back.
  function setOpen(open) {
    document.body.classList.toggle('is-starting', open);
    screen.inert = !open;
  }

  function choose(mode) {
    lightUp(mode);
    onChoose(mode);
    setOpen(false);
  }

  function open(mode) {
    lightUp(mode);
    setOpen(true);
    centerShownCard();
  }

  // While the start screen is open, the keys are its own: no key reaches the
  // sketch or the panel, so s, g or Space do nothing yet. Tab and Enter still
  // move between the cards and pick one, as the browser does for buttons.
  // `true` hears every key before the sketch and the panel do.
  window.addEventListener('keydown', (event) => {
    if (isOpen()) event.stopPropagation();
  }, true);

  lightUp(startingMode);
  // once the page is laid out, and whenever the window changes size (it may
  // turn narrow), the lit-up card goes to the carousel's middle
  requestAnimationFrame(centerShownCard);
  window.addEventListener('resize', centerShownCard);

  function updateSwitches() {
    for (const switchButton of switchButtons) switchButton.updateDisplay();
  }

  return { open, isOpen, updateSwitches };
}
