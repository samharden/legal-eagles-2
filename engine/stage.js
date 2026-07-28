"use strict";
// ============================== STAGE ==============================
// Canvas, sizing, camera and the shared palette. LE2 differs from LE1 in one
// deliberate way: the canvas is ENTIRELY playfield on every platform and the
// HUD is DOM everywhere. LE1 drew a 116px HUD band on desktop and a DOM HUD on
// touch, which meant every UI change had to be made twice and every layout
// constant had a mobile exception. One HUD, one code path.

export const cv = document.getElementById('cv');
export const ctx = cv.getContext('2d');

// ?touch=1 forces the mobile layout on a desktop browser (dev); ?touch=0 forces
// it off on a tablet with a keyboard.
const Q = new URLSearchParams(location.search);
const TOUCH_Q = Q.get('touch');
export const IS_TOUCH = TOUCH_Q !== null ? TOUCH_Q !== '0'
  : (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
export const DEV = Q.get('edit') === '1' || Q.get('dev') === '1';

// A phone held upright gets a portrait board cut to the box the masthead and
// the thumb shelf leave. Desktop gets a fixed 960x600 landscape board.
export const PORTRAIT = IS_TOUCH && window.innerHeight > window.innerWidth;
if (PORTRAIT) {
  const cs = getComputedStyle(document.documentElement);
  const cssPx = v => parseFloat(cs.getPropertyValue(v)) || 0;
  const availH = Math.max(260, window.innerHeight - cssPx('--chrome') - cssPx('--shelf'));
  const availW = Math.max(260, window.innerWidth - 12);
  cv.width = 720;
  cv.height = Math.round(Math.min(1400, Math.max(680, 720 * availH / availW)));
  const root = document.documentElement.style;
  root.setProperty('--board-ar', cv.width + ' / ' + cv.height);
  root.setProperty('--board-k', (cv.width / cv.height).toFixed(4));
}
export const W = cv.width, H = cv.height;

export const TILE = 40;

// palette — mirrored in index.html's stylesheet
export const C = {
  gold: '#f0c75e', dim: '#8d82a8', muted: '#b6a9d0', line: '#6b5c8f',
  rule: '#2e2745', ink: '#e8e0f0', void: '#08060f', cyan: '#5ec8f0',
  green: '#9be05e', red: '#c0392b',
};

// ---- camera ---------------------------------------------------------------
// The camera lives in GLOBAL WORLD PIXELS. There is no per-map coordinate
// space in LE2 — the city is one continuous grid, so the camera never resets.
export const cam = { x: 0, y: 0 };

const ZOOM_MIN = 0.8, ZOOM_MAX = 2.6;
export const view = { zoom: 1, w: W, h: H };

export function setZoom(z) {
  view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  view.w = W / view.zoom; view.h = H / view.zoom;
  try { localStorage.setItem('le2_zoom', view.zoom.toFixed(3)); } catch (e) {}
  const chip = document.getElementById('tbZ');
  if (chip) chip.textContent = view.zoom.toFixed(1).replace('.0', '') + '×';
}
export function cycleZoom() {
  const steps = [1, 1.4, 1.8, 2.2];
  const i = steps.findIndex(z => Math.abs(z - view.zoom) < 0.05);
  setZoom(steps[(i + 1) % steps.length]);
}
(function initZoom() {
  let saved = null;
  try { saved = parseFloat(localStorage.getItem('le2_zoom')); } catch (e) {}
  setZoom(saved > 0 ? saved : (IS_TOUCH ? 1.8 : 1.2));
})();

// Follow a point without clamping to a map rectangle — an open world has no
// edges to hold the camera inside. Unloaded space reads as void, which is what
// the city's unbuilt lots should look like anyway.
export function camFollow(x, y) {
  cam.x = x - view.w / 2;
  cam.y = y - view.h / 2;
}

// screen <-> world
export const toWorld = (sx, sy) => ({ x: sx / view.zoom + cam.x, y: sy / view.zoom + cam.y });
export const toScreen = (wx, wy) => ({ x: (wx - cam.x) * view.zoom, y: (wy - cam.y) * view.zoom });

// ---- fullscreen -----------------------------------------------------------
export function toggleFullscreen() {
  const wrap = document.getElementById('wrap');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (fsEl) { const p = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (p && p.catch) p.catch(() => {}); }
    else { const p = (wrap.requestFullscreen || wrap.webkitRequestFullscreen).call(wrap); if (p && p.catch) p.catch(() => {}); }
  } catch (e) { /* unsupported (iPhone Safari) — play on in the page */ }
}

// ---- text helpers ---------------------------------------------------------
export function wrapText(g, text, maxW) {
  const words = String(text).split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
