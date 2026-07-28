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

// ---- named characters -----------------------------------------------------
// Marisol Ruiz — laundromat, The Strand. Apron, forearms, no patience left.
SPR.ruiz = makeSprite([
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  "....hhffffhh....",
  "....hfkffkfh....",
  "....hffffffh....",
  ".....ffffff.....",
  "......ffff......",
  "....rrrrrrrr....",
  "...frraaaarrf...",
  "...frraaaarrf...",
  "....raaaaaar....",
  "....rraaaarr....",
  ".....rr..rr.....",
  ".....rr..rr.....",
  ".....kk..kk.....",
], { h: '#2b1d12', f: SKIN, k: K, r: '#8c3a3a', a: '#e0d8c4' });

// Hector — newsstand, Courthouse Square, est. 1991. Cardigan, cap, opinions.
SPR.hector = makeSprite([
  "................",
  ".....cccccc.....",
  "....cccccccc....",
  "....ccffffcc....",
  "....ffkffkff....",
  "....ffffffff....",
  ".....ffmmff.....",
  "......ffff......",
  "....ggggggg.....",
  "...ggwwggwwgg...",
  "...ggwwggwwgg...",
  "...gg.gggg.gg...",
  "....gggggggg....",
  ".....gg..gg.....",
  ".....gg..gg.....",
  ".....kk..kk.....",
], { c: '#3e4a63', f: SKIN, k: K, m: '#7a6a58', g: '#6b5a3e', w: '#4a3f2c' });

// Arturo Delgado — closes on Tuesdays, has been holding a summons upside down.
SPR.delgado = makeSprite([
  "................",
  "......kkkk......",
  ".....kkkkkk.....",
  "....kkffffk.....",
  "....ffkffkf.....",
  "....ffffffff....",
  ".....ffmmff.....",
  "......ffff......",
  "....bbbbbbbb....",
  "...bbwwbbwwbb...",
  "...bbbbbbbbpp...",
  "...bb.bbbb.pp...",
  "....bbbbbbbb....",
  ".....bb..bb.....",
  ".....bb..bb.....",
  ".....kk..kk.....",
], { k: '#2a2018', f: SKIN, m: '#7a6a58', b: '#4a6070', w: '#38505e', p: '#efe6d0' });

// The Night Clerk. Nobody has described his face afterward.
SPR.clerk = makeSprite([
  "................",
  "......pppp......",
  ".....pppppp.....",
  "....ppssssp.....",
  "....psksskp.....",
  "....pssssspp....",
  ".....ssssss.....",
  "......ssss......",
  "....nnnnnnnn....",
  "...nnwwnnwwnn...",
  "...nnnnnnnnnn...",
  "...nn.nnnn.nn...",
  "....nnnnnnnn....",
  ".....nn..nn.....",
  ".....nn..nn.....",
  ".....kk..kk.....",
], { p: '#5a5468', s: '#c9c2b4', k: '#0e0d12', n: '#22202e', w: '#8f88a6' });

// Dee Ferraro — drives a hook truck on Motor Row. High-vis, brace, and the
// specific stillness of somebody who has been told not to turn her head.
SPR.dee = makeSprite([
  "................",
  "......nnnn......",
  ".....nnnnnn.....",
  "....nnffffn.....",
  "....nfkffkf.....",
  "....nffffffn....",
  ".....cccccc.....",
  "......cccc......",
  "....vvvvvvvv....",
  "...vvyyvvyyvv...",
  "...vvyyvvyyvv...",
  "...vv.vvvv.vv...",
  "....vvvvvvvv....",
  ".....dd..dd.....",
  ".....dd..dd.....",
  ".....kk..kk.....",
], { n: '#2c1f19', f: SKIN, k: K, c: '#dcd6c8', v: '#c8631f', y: '#f0e14a', d: '#2a3040' });

// Dr. Kestenbaum — walk-ins welcome, abogados welcomer. The coat is very white.
SPR.kestenbaum = makeSprite([
  "................",
  "......gggg......",
  ".....gggggg.....",
  "....ggffffg.....",
  "....ffkffkf.....",
  "....ffffffff....",
  ".....ffmmff.....",
  "......ffff......",
  "....wwwwwwww....",
  "...wwwbbwwwww...",
  "...wwwwwwwwww...",
  "...ww.wwww.ww...",
  "....wwwwwwww....",
  ".....ww..ww.....",
  ".....nn..nn.....",
  ".....kk..kk.....",
], { g: '#8d8d93', f: SKIN, k: K, m: '#6f6258', w: '#eef0f2', b: '#3f6ea8', n: '#2b2b33' });

// The Yard Man. Been on the gate a long time. Has a clipboard he never writes on.
SPR.yardman = makeSprite([
  "................",
  ".....kkkkkkk....",
  "....kkkkkkkkk...",
  "....kkssssk.....",
  "....ksksskk.....",
  "....kssssskk....",
  ".....ssssss.....",
  "......ssss......",
  "....jjjjjjjj....",
  "...jjooijjojj...",
  "...jjjjjjjjjj...",
  "...jj.jjjj.jj...",
  "....jjjjjjjj....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....kk..kk.....",
], { k: '#161520', s: '#b9b2a4', j: '#31382c', o: '#4d5546', i: '#d8d2c0' });

// Renata Vosloo, paralegal. Fifteen years of other people's filings, and a
// redweld she carries the way other people carry a weapon.
SPR.paralegal = makeSprite([
  "................",
  "......bbbb......",
  ".....bbbbbb.....",
  "....bbffffbb....",
  "....bfkffkfb....",
  "....bffffffb....",
  ".....ffffff.....",
  "......ffff......",
  "....tttttttt....",
  "...rrtttttttt...",
  "...rrttttttttt..",
  "...rr.tttttt.t..",
  "....tttttttt....",
  ".....tt..tt.....",
  ".....tt..tt.....",
  ".....kk..kk.....",
], { b: '#3a2a3e', f: '#c99a6e', k: K, t: '#3f4a5e', r: '#a8562c' });

// Iris Nakamura — tenants' council, The Flats. Six weeks of clipboard, thirty
// signatures, and the same cardigan on both layers, which is the point of her.
SPR.iris = makeSprite([
  "................",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....kkffffkk....",
  "....kffkffkf....",
  "....kffffffk....",
  ".....ffffff.....",
  "......ffff......",
  "....gggggggg....",
  "...ggppppppgg...",
  "...ggpppppppg...",
  "...gg.pppp.gg...",
  "....gggggggg....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....kk..kk.....",
], { k: '#1c1c22', f: '#d9a97c', g: '#6b7f5a', p: '#e6e0cc', j: '#3a3a46' });

// W. Halloran — the buyer's counsel. The coat cost more than your month.
SPR.halloran = makeSprite([
  "................",
  "......cccc......",
  ".....cccccc.....",
  "....ccffffc.....",
  "....cfkffkf.....",
  "....cffffffc....",
  ".....ffffff.....",
  "......ffff......",
  "....CCCCCCCC....",
  "...CCCwswCCCC...",
  "...CCCwswCCCC...",
  "...CC.CCCC.CC...",
  "....CCCCCCCC....",
  ".....CC..CC.....",
  ".....CC..CC.....",
  ".....kk..kk.....",
], { c: '#6e6350', f: SKIN, k: K, C: '#2f3a34', w: '#f2f2f2', s: '#8c2f3a' });

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

// A grievance. It is a piece of paper and it is following you.
SPR.grievance = makeSprite([
  "................",
  "...wwwwwwwwww...",
  "...wrrrrrrrrw...",
  "...wwwwwwwwww...",
  "...wkkkkkkkkw...",
  "...wwwwwwwwww...",
  "...wkkkkkkwww...",
  "...wwwwwwwwww...",
  "...wkkkkkkkkw...",
  "...wwwwwwwwww...",
  "...wkkkkwwwww...",
  "...wwwwwwwwww...",
  "...wwwwrrrrww...",
  "...wwwwwwwwww...",
  "................",
  "................",
], { w: '#efe6d0', k: '#6b6478', r: '#c0392b' });

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
