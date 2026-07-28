"use strict";
// ============================== SPRITES ==============================
// Every sprite is a 16x16 grid of palette characters ('.' = transparent), baked
// once to an offscreen canvas and drawn scaled with smoothing off. No image
// files, no atlas, no loader — the art IS the source.

export function makeSprite(rows, pal) {
  const h = rows.length, w = rows[0].length;
  for (const r of rows) if (r.length !== w) console.warn('Malformed sprite row:', r);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (ch === '.') continue;
    g.fillStyle = pal[ch] || '#ff00ff';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

// A bad sprite key must not throw between save() and restore() — that corrupts
// the canvas transform permanently and every later frame draws offset. LE1 hit
// exactly this bug; the guard is the fix, kept.
export function drawSprite(g, spr, x, y, size, flip = false, alpha = 1) {
  if (!spr) return;
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = alpha;
  g.translate(x, y);
  if (flip) g.scale(-1, 1);
  g.drawImage(spr, -size / 2, -size / 2, size, size);
  g.restore();
}

const SKIN = '#e8b88a', K = '#1d1d22', WHT = '#f2f2f2';
export const SPR = {};

// ---- the attorney ---------------------------------------------------------
SPR.p_m = makeSprite([
  "................",
  ".....bbbbbb.....",
  "....bbbbbbbb....",
  "....bffffffb....",
  "....ffffffff....",
  "....fkffffkf....",
  "....ffffffff....",
  ".....ffffff.....",
  "......ffff......",
  "....nnnnnnnn....",
  "...nnnwtwnnnn...",
  "...nnnwtwnnnn...",
  "...n.nnnnnn.n...",
  ".....nn..nn.....",
  ".....nn..nn.....",
  ".....kk..kk.....",
], { b: '#5a3a1e', f: SKIN, k: K, n: '#2e3f6e', w: WHT, t: '#c0392b' });

SPR.p_f = makeSprite([
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhffffffhh...",
  "...hhfkffkfhh...",
  "...hhffffffhh...",
  "...hhffffffhh...",
  "...h..ffff..h...",
  "....mmmmmmmm....",
  "...mmmwtwmmmm...",
  "...mmmwtwmmmm...",
  "...m.mmmmmm.m...",
  "....mmmmmmmm....",
  ".....f....f.....",
  ".....f....f.....",
  ".....k....k.....",
], { h: '#3b2614', f: SKIN, k: K, m: '#7e2d4e', w: WHT, t: '#caa84a' });

// ---- the opposition -------------------------------------------------------
// Process Server: windbreaker, clipboard, moves like he's already found you.
SPR.server = makeSprite([
  "................",
  "......kkkk......",
  ".....kkkkkk.....",
  ".....ffffff.....",
  ".....fkffkf.....",
  ".....ffffff.....",
  "......ffff......",
  "....gggggggg....",
  "...ggggggggpp...",
  "...ggggggggpp...",
  "...g.gggggg.g...",
  "....gggggggg....",
  ".....gg..gg.....",
  ".....gg..gg.....",
  ".....kk..kk.....",
  "................",
], { k: K, f: SKIN, g: '#2f5d3a', p: '#e8e0d0' });

// The Unbilled: your own hours, itemized and ambulatory. A person-shaped stack
// of timesheet, held together by the assumption that someone will pay for it.
SPR.unbilled = makeSprite([
  "................",
  ".....pppppp.....",
  "....pp.pp.pp....",
  "....pppppppp....",
  "....p.pppp.p....",
  "....pppppppp....",
  ".....pppppp.....",
  "....qqqqqqqq....",
  "...qqppqqppqq...",
  "...qqqqqqqqqq...",
  "...qq.qqqq.qq...",
  "....qqqqqqqq....",
  ".....qq..qq.....",
  ".....qq..qq.....",
  ".....pp..pp.....",
  "................",
], { p: '#d8d0c0', q: '#8f88a6' });

// ---- civilians ------------------------------------------------------------
SPR.civ = makeSprite([
  "................",
  "................",
  "......cccc......",
  ".....cccccc.....",
  ".....ffffff.....",
  ".....fkffkf.....",
  ".....ffffff.....",
  "......ffff......",
  "....vvvvvvvv....",
  "...vvvvvvvvvv...",
  "...vvvvvvvvvv...",
  "....vvvvvvvv....",
  ".....vv..vv.....",
  ".....vv..vv.....",
  ".....kk..kk.....",
  "................",
], { c: '#6b4a2a', f: SKIN, k: K, v: '#4a4560' });

// ---- props ----------------------------------------------------------------
SPR.dossier = makeSprite([
  "................",
  "..llllllllllll..",
  "..lwwwwwwwwwwl..",
  "..lwkkkkkkkkwl..",
  "..lwwwwwwwwwwl..",
  "..lwkkkkkkwwwl..",
  "..lwwwwwwwwwwl..",
  "..lwkkkkkkkkwl..",
  "..lwwwwwwwwwwl..",
  "..lwkkkkwwwwwl..",
  "..lwwwwwwwwwwl..",
  "..lwkkkkkkkkwl..",
  "..lwwwwwwwwwwl..",
  "..llllllllllll..",
  "................",
  "................",
], { l: '#b08a3a', w: '#efe6d0', k: '#6b6478' });

SPR.sign = makeSprite([
  "................",
  "..gggggggggggg..",
  "..gkkkkkkkkkkg..",
  "..gkggggggggkg..",
  "..gkggggggggkg..",
  "..gkggggggggkg..",
  "..gkkkkkkkkkkg..",
  "..gggggggggggg..",
  ".......ww.......",
  ".......ww.......",
  ".......ww.......",
  ".......ww.......",
  "......wwww......",
  "................",
  "................",
  "................",
], { g: '#caa84a', k: '#2b2438', w: '#5b5270' });

// The corkboard outside the laundromat. In LE2 this is how you find work.
SPR.board = makeSprite([
  "................",
  ".bbbbbbbbbbbbbb.",
  ".bppbbbbppbbbbb.",
  ".bppbbbbppbbppb.",
  ".bbbbbbbbbbbppb.",
  ".bbbppbbbbbbbbb.",
  ".bbbppbbbppbbbb.",
  ".bbbbbbbbppbbbb.",
  ".bppbbbbbbbbppb.",
  ".bppbbbppbbbppb.",
  ".bbbbbbppbbbbbb.",
  ".bbbbbbbbbbbbbb.",
  "......ww..ww....",
  "......ww..ww....",
  "......ww..ww....",
  "................",
], { b: '#7a5c34', p: '#efe6d0', w: '#3b3450' });

// ---- particles ------------------------------------------------------------
SPR.spark = makeSprite([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......yy.......",
  "......yyyy......",
  "......yyyy......",
  ".......yy.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], { y: '#ffe9a8' });

SPR.paper = makeSprite([
  "................",
  "................",
  "................",
  "................",
  ".....wwwwww.....",
  ".....wkkkkw.....",
  ".....wwwwww.....",
  ".....wkkkkw.....",
  ".....wwwwww.....",
  ".....wkkkkw.....",
  ".....wwwwww.....",
  "................",
  "................",
  "................",
  "................",
  "................",
], { w: '#efe6d0', k: '#a49bb8' });
