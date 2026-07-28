"use strict";
// ============================== INPUT ==============================
// One action layer over four sources: keyboard, mouse, touch buttons, gamepad.
//
// LE1 had no such layer. Every source wrote into a shared `keys{}` object and
// the gamepad had to fake key transitions ("write only on change so the
// keyboard coexists") to avoid clobbering it. It worked, but every new binding
// had to be added in four places and edge-detection was re-derived per caller.
//
// Here each source reports into its own bucket, `beginFrame()` merges them into
// one action state, and edges come from a single prev/now diff. Adding a
// binding is one line in BINDINGS. Callers ask questions — Input.down('fire'),
// Input.pressed('confirm'), Input.nav() — and never touch a source directly.

import { cv, IS_TOUCH, W, H, toWorld, view } from './stage.js';

// action -> keyboard keys (lowercased e.key)
const BINDINGS = {
  up: ['w', 'arrowup'], down: ['s', 'arrowdown'],
  left: ['a', 'arrowleft'], right: ['d', 'arrowright'],
  fire: ['k'], strike: ['j', ' '], spin: ['l'], dash: ['shift'],
  interact: ['e'], confirm: ['e', 'enter', ' '], cancel: ['escape'],
  bag: ['i'], manual: ['h'], mute: ['m'], fullscreen: ['f'],
  casefile: ['c', 'tab'],
  zoomIn: ['=', '+'], zoomOut: ['-', '_'],
  // dev only — main.js ignores these unless ?dev=1
  devLayer: ['p'], devSave: ['o'], devLoad: ['u'],
};

// action -> standard-mapping gamepad button indices
const PAD_BUTTONS = {
  confirm: [0], interact: [0], strike: [1], cancel: [1],
  fire: [2, 5, 7], spin: [3], dash: [4, 6],
  bag: [9], manual: [8], casefile: [9],
};

const ACTIONS = Object.keys(BINDINGS);

const src = {
  key: {},      // keyboard held
  touch: {},    // on-screen button held
  pad: {},      // gamepad held
};

// A press shorter than one frame is still a press. Polling `held` alone loses
// any tap whose keydown and keyup land between two frames — which is most taps
// from a fast typist and every synthetic one. Event handlers latch the press
// here; beginFrame() ORs the latch into the held state and clears it, so the
// action reads as down for exactly one frame and `pressed()` sees a real edge.
const latch = { key: {}, touch: {} };
let numLatch = 0;

let now = {}, prev = {};
let stick = { x: 0, y: 0 };     // touch joystick / pad left stick
let navNow = 'none', navPrev = 'none';

export const mouse = { x: W / 2, y: H / 2, down: false, over: false };
export const pad = { on: false, aim: null };   // aim: {x,y} unit vector from the right stick

// Handlers the host installs so the input layer never imports game code.
export const hooks = {
  onMute: null, onFullscreen: null, onZoom: null, onCanvasTap: null, onWheel: null,
};

/* ------------------------------ keyboard ------------------------------ */
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === ' ' || k === '/' || k === 'tab' || k.startsWith('arrow')) e.preventDefault();
  // one-shot system keys never enter the action state — they'd need a consumer
  if (k === 'm') { if (hooks.onMute) hooks.onMute(); return; }
  if (k === 'f') { if (hooks.onFullscreen) hooks.onFullscreen(); return; }
  src.key[k] = true;
  latch.key[k] = true;
  if (/^[1-9]$/.test(k)) numLatch = +k;   // number row, for dialog choices
});
window.addEventListener('keyup', e => { src.key[e.key.toLowerCase()] = false; });
// a tab-out must not leave a key stuck down
window.addEventListener('blur', () => { for (const k in src.key) src.key[k] = false; });

/* -------------------------------- mouse ------------------------------- */
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
  mouse.over = true;
});
cv.addEventListener('mouseleave', () => { mouse.over = false; });
cv.addEventListener('mousedown', () => { mouse.down = true; });
window.addEventListener('mouseup', () => { mouse.down = false; });
cv.addEventListener('click', e => {
  if (!hooks.onCanvasTap) return;
  const r = cv.getBoundingClientRect();
  hooks.onCanvasTap((e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height));
});
cv.addEventListener('wheel', e => {
  e.preventDefault();
  if (hooks.onWheel) hooks.onWheel(e.deltaY);
}, { passive: false });

// world-space cursor, for aim-at-cursor fire
export const mouseWorld = () => toWorld(mouse.x, mouse.y);

/* -------------------------------- touch ------------------------------- */
if (IS_TOUCH) {
  document.body.classList.add('touch');

  // every on-screen button declares its action in markup: <button data-act="fire">
  for (const el of document.querySelectorAll('[data-act]')) {
    const act = el.dataset.act;
    const on = e => { e.preventDefault(); src.touch[act] = true; latch.touch[act] = true; };
    const off = e => { e.preventDefault(); src.touch[act] = false; };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  }
  // one-shot chips
  for (const [id, hook] of [['tbM', 'onMute'], ['tbZ', 'onZoom']]) {
    const el = document.getElementById(id);
    if (!el) continue;
    const go = e => { e.preventDefault(); if (hooks[hook]) hooks[hook](); };
    el.addEventListener('touchstart', go, { passive: false });
    el.addEventListener('click', go);
  }

  const joyEl = document.getElementById('joy'), stickEl = document.getElementById('stick');
  if (joyEl) {
    const joyMove = t => {
      const r = joyEl.getBoundingClientRect();
      let jx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let jy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(jx, jy);
      if (m > 1) { jx /= m; jy /= m; }
      stick.x = jx; stick.y = jy;
      stickEl.style.transform = `translate(${jx * 34}px, ${jy * 34}px)`;
    };
    joyEl.addEventListener('touchstart', e => { e.preventDefault(); joyMove(e.changedTouches[0]); }, { passive: false });
    joyEl.addEventListener('touchmove', e => { e.preventDefault(); joyMove(e.changedTouches[0]); }, { passive: false });
    const end = e => { e.preventDefault(); stick.x = 0; stick.y = 0; stickEl.style.transform = ''; };
    joyEl.addEventListener('touchend', end, { passive: false });
    joyEl.addEventListener('touchcancel', end, { passive: false });
  }

  // pinch zoom + tap-through to the canvas handler
  let pinchD = 0, pinchZ = 0;
  const spread = e => Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY);
  cv.addEventListener('touchstart', e => {
    if (e.touches.length === 2) { pinchD = spread(e); pinchZ = view.zoom; return; }
    e.preventDefault();
    const t = e.changedTouches[0], r = cv.getBoundingClientRect();
    if (hooks.onCanvasTap) hooks.onCanvasTap((t.clientX - r.left) * (W / r.width), (t.clientY - r.top) * (H / r.height));
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !pinchD) return;
    e.preventDefault();
    if (hooks.onZoom) hooks.onZoom(pinchZ * (spread(e) / pinchD));
  }, { passive: false });
  const pinchEnd = () => { pinchD = 0; };
  cv.addEventListener('touchend', pinchEnd);
  cv.addEventListener('touchcancel', pinchEnd);
}

/* ------------------------------- gamepad ------------------------------ */
function pollPad() {
  for (const k in src.pad) src.pad[k] = false;
  pad.aim = null;
  if (!navigator.getGamepads) return { x: 0, y: 0 };

  let gp = null;
  try { for (const g of navigator.getGamepads()) if (g && g.connected) { gp = g; break; } } catch (e) { return { x: 0, y: 0 }; }
  if (!gp) return { x: 0, y: 0 };
  if (!pad.on) pad.on = true;

  const pressed = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  for (const act in PAD_BUTTONS) if (PAD_BUTTONS[act].some(pressed)) src.pad[act] = true;

  // left stick + d-pad -> movement
  let mx = gp.axes[0] || 0, my = gp.axes[1] || 0;
  if (pressed(14)) mx = -1; if (pressed(15)) mx = 1;
  if (pressed(12)) my = -1; if (pressed(13)) my = 1;
  if (Math.hypot(mx, my) < 0.24) { mx = 0; my = 0; }

  // right stick -> aim + hold fire (twin-stick)
  const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0, am = Math.hypot(ax, ay);
  if (am > 0.35) { pad.aim = { x: ax / am, y: ay / am }; src.pad.fire = true; }

  return { x: mx, y: my };
}

/* ------------------------------- frame -------------------------------- */
export function beginFrame() {
  const padStick = pollPad();

  const held = {};
  for (const act of ACTIONS) {
    held[act] = !!src.touch[act] || !!latch.touch[act] || !!src.pad[act]
      || BINDINGS[act].some(k => src.key[k] || latch.key[k]);
  }
  latch.key = {}; latch.touch = {};
  // mouse button fires, but only while the cursor is over the board
  if (mouse.down && mouse.over && !IS_TOUCH) held.fire = true;

  prev = now; now = held;

  // one-shot navigation direction, shared by every menu/dialog/list
  const v = vec();
  let dir = 'none';
  if (Math.abs(v.x) > Math.abs(v.y)) { if (v.x < -0.5) dir = 'left'; else if (v.x > 0.5) dir = 'right'; }
  else { if (v.y < -0.5) dir = 'up'; else if (v.y > 0.5) dir = 'down'; }
  navPrev = navNow; navNow = dir;

  return padStick;
}

let _padStick = { x: 0, y: 0 };
export function frame() { _padStick = beginFrame(); }

/** Movement vector, magnitude <= 1. Merges keys, touch stick and pad stick. */
export function vec() {
  let x = _padStick.x + stick.x, y = _padStick.y + stick.y;
  if (now.left) x -= 1;
  if (now.right) x += 1;
  if (now.up) y -= 1;
  if (now.down) y += 1;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y };
}

export const down = a => !!now[a];
export const pressed = a => !!now[a] && !prev[a];
export const released = a => !now[a] && !!prev[a];

/** Edge-triggered menu direction: 'up' | 'down' | 'left' | 'right' | 'none'. */
export const nav = () => navNow !== navPrev ? navNow : 'none';

/** A number-row key pressed since the last call, or 0. Dialog choices use this. */
export function numberPressed() {
  const n = numLatch; numLatch = 0; return n;
}

/** Force an action's edge to be treated as spent (a handler swallowed it). */
export function consume(a) { prev[a] = true; }

/** Drop every held action — used when a modal opens so nothing leaks under it. */
export function clearHeld() {
  for (const k in src.key) src.key[k] = false;
  for (const k in src.touch) src.touch[k] = false;
  stick.x = 0; stick.y = 0;
}
