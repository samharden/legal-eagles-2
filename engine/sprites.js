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

// Collections Agent: a lanyard, a tablet, and the patience of an amortisation
// schedule. Does not want to hurt you. Wants a hundred and forty dollars.
SPR.collections = makeSprite([
  "................",
  "......nnnn......",
  ".....nnnnnn.....",
  ".....ffffff.....",
  ".....fkffkf.....",
  ".....ffffff.....",
  "......ffff......",
  "......ll.l......",
  "....bbbbbbbb....",
  "...bbbbbbbbtt...",
  "...bbbbbbbbtt...",
  "...b.bbbbbb.b...",
  "....bbbbbbbb....",
  ".....bb..bb.....",
  ".....bb..bb.....",
  ".....kk..kk.....",
], { n: '#39312a', f: SKIN, k: K, b: '#4b4f63', l: '#c0a83e', t: '#22242e' });

// The Ambulance Chaser. Not looking at you. Has never once looked at you.
SPR.chaser = makeSprite([
  "................",
  "......hhhh......",
  ".....hhhhhh.....",
  "....hhffffh.....",
  "....hfkffkf.....",
  "....hffffffh....",
  ".....ffffff.....",
  "......ffff......",
  "....rrrrrrrr....",
  "...rrwwrrwwrr...",
  "...rrrrrrrrcc...",
  "...rr.rrrr.cc...",
  "....rrrrrrrr....",
  ".....rr..rr.....",
  ".....rr..rr.....",
  ".....kk..kk.....",
], { h: '#6b2f4a', f: SKIN, k: K, r: '#a03050', w: '#f2e6ea', c: '#e0c860' });

// Notice of Deposition. Not a person. A caption, a date, and a demand that you
// be somewhere at nine in the morning, standing up on its own.
SPR.depo = makeSprite([
  "................",
  "...pppppppppp...",
  "...pkkkkkkkkp...",
  "...pppppppppp...",
  "...pkkkkkkpppp..",
  "...pppppppppp...",
  "...pkkkkkkkkp...",
  "...pppppppppp...",
  "...pkkkkpppppp..",
  "...pppppppppp...",
  "...pkkkkkkkkp...",
  "...pppppppppp...",
  "....ssssssss....",
  ".....ss..ss.....",
  ".....ss..ss.....",
  "................",
], { p: '#efe9d8', k: '#5a5568', s: '#8a8296' });

// The Landlord. Only exists while you owe him, which is the entire character.
SPR.landlord = makeSprite([
  "................",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....ffffffff....",
  "....fkffffkf....",
  "....ffffffff....",
  ".....ffmmff.....",
  "......ffff......",
  "...yyyyyyyyyy...",
  "..yyyyyyyyyyyy..",
  "..yyyyyyyyyyyy..",
  "..yy.yyyyyy.yy..",
  "...yyyyyyyyyy...",
  "....yy....yy....",
  "....yy....yy....",
  "....kk....kk....",
], { k: '#241d16', f: SKIN, m: '#6b5a48', y: '#7a4a2a' });

// DC&H Retrieval Associates. Identical, which is deliberate on somebody's part.
SPR.retrieval = makeSprite([
  "................",
  "......kkkk......",
  ".....kkkkkk.....",
  ".....ffffff.....",
  ".....fwffwf.....",
  ".....ffffff.....",
  "......ffff......",
  "....nnnnnnnn....",
  "...nnnwwwnnnn...",
  "...nnnnnnnnnn...",
  "...nn.nnnn.nn...",
  "....nnnnnnnn....",
  ".....nn..nn.....",
  ".....nn..nn.....",
  ".....kk..kk.....",
  "................",
], { k: '#101018', f: '#b8a894', n: '#1c2436', w: '#6fa8c8' });

// The Ones Who Stayed. Still at the desk. Not coming for you. Right there.
SPR.stayed = makeSprite([
  "................",
  "......dddd......",
  ".....dddddd.....",
  "....ddssssd.....",
  "....dsksskd.....",
  "....dssssdd.....",
  ".....ssssss.....",
  "......ssss......",
  "....eeeeeeee....",
  "...eeeeeeeeee...",
  "...eeeeeeeeee...",
  "...ee.eeee.ee...",
  "....eeeeeeee....",
  ".....ee..ee.....",
  ".....ee..ee.....",
  ".....kk..kk.....",
], { d: '#2b2833', s: '#9a9284', k: '#0c0b10', e: '#3a3546' });

// ---- Past Selves ----------------------------------------------------------
// You, at three ranks. Same build as the player sprite on purpose — the shape
// is supposed to be recognisable before the colour tells you which one it is.
SPR.past_junior = makeSprite([
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhffffffhh...",
  "...hhf.ff.fhh...",
  "...hhffffffhh...",
  "...hhffffffhh...",
  "...h..ffff..h...",
  "....jjjjjjjj....",
  "...jjjwtwjjjj...",
  "...jjjwtwjjjj...",
  "...j.jjjjjj.j...",
  "....jjjjjjjj....",
  ".....j....j.....",
  ".....j....j.....",
  ".....k....k.....",
], { h: '#3b2614', f: '#9aa4b0', k: K, j: '#3d5f7a', w: '#e8e8ee', t: '#7fa8c0' });

SPR.past_counsel = makeSprite([
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhffffffhh...",
  "...hhf.ff.fhh...",
  "...hhffffffhh...",
  "...hhffffffhh...",
  "...h..ffff..h...",
  "....vvvvvvvv....",
  "...vvvwtwvvvv...",
  "...vvvwtwvvvv...",
  "...v.vvvvvv.v...",
  "....vvvvvvvv....",
  ".....v....v.....",
  ".....v....v.....",
  ".....k....k.....",
], { h: '#332038', f: '#9a8fa4', k: K, v: '#5c3f74', w: '#e8e8ee', t: '#b08fd0' });

SPR.past_partner = makeSprite([
  "................",
  ".....hhhhhh.....",
  "....hhhhhhhh....",
  "...hhffffffhh...",
  "...hhf.ff.fhh...",
  "...hhffffffhh...",
  "...hhffffffhh...",
  "...h..ffff..h...",
  "....gggggggg....",
  "...gggwtwgggg...",
  "...gggwtwgggg...",
  "...g.gggggg.g...",
  "....gggggggg....",
  ".....g....g.....",
  ".....g....g.....",
  ".....k....k.....",
], { h: '#2a2118', f: '#b09a72', k: K, g: '#5a4420', w: '#f0e6c8', t: '#f0c75e' });

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

// Emmett Hargrove. From the first game, four months older, standing in a plaza
// at eleven in the morning with no coat and no reason to be out there.
SPR.hargrove = makeSprite([
  "................",
  "......gggg......",
  ".....gggggg.....",
  "....ggffffg.....",
  "....gfkffkf.....",
  "....gffffffg....",
  ".....ffffff.....",
  "......ffff......",
  "....nnnnnnnn....",
  "...nnnwrwnnnn...",
  "...nnnwrwnnnn...",
  "...nn.nnnn.nn...",
  "....nnnnnnnn....",
  ".....nn..nn.....",
  ".....nn..nn.....",
  ".....kk..kk.....",
], { g: '#a8a49c', f: '#d8b48c', k: K, n: '#2b3040', w: '#eceff2', r: '#7a2f3a' });

// Ferris — thirty-one years behind the records counter. Knows which file you
// want before you say it, and has decided that is not the same as helping.
SPR.ferris = makeSprite([
  "................",
  "......gggg......",
  ".....gggggg.....",
  "....ggffffg.....",
  "....gfyffyf.....",
  "....gffffffg....",
  ".....ffffff.....",
  "......ffff......",
  "....tttttttt....",
  "...ttcccccctt...",
  "...ttttttttttt..",
  "...tt.tttt.tt...",
  "....tttttttt....",
  ".....tt..tt.....",
  ".....tt..tt.....",
  ".....kk..kk.....",
], { g: '#9c9a90', f: '#c9a884', k: K, t: '#4a4a3e', c: '#d8d4c4', y: '#2b2b33' });

// ---- bosses ---------------------------------------------------------------
// THE NON-COMPETE. A contract-golem: a stack of executed paper with a seal for
// a face and two clauses for arms. Cousin to LE1's Founding Agreement.
SPR.noncompete = makeSprite([
  "....pppppppp....",
  "...pppppppppp...",
  "...pkkppppkkp...",
  "...pppppppppp...",
  "...ppkkkkkkpp...",
  "...pppppppppp...",
  "..spppppppppps..",
  "..sppprrrpppps..",
  "..spppprrppppp..",
  "...pppppppppp...",
  "...pkkkkkkkkp...",
  "...pppppppppp...",
  "...pppppppppp...",
  "....pp....pp....",
  "....pp....pp....",
  "....kk....kk....",
], { p: '#e6dfcc', k: '#4a4436', r: '#8c2f3a', s: '#b8ab8e' });

// THE FIRM. The going concern. A tower with the windows lit, on legs, and the
// glow underneath it is a copier that has not stopped in forty years.
SPR.thefirm = makeSprite([
  "...tttttttttt...",
  "...tggttggttt...",
  "...tttttttttt...",
  "...tggttggttt...",
  "...tttttttttt...",
  "...tggttggttt...",
  "...tttttttttt...",
  "..ttttttttttttt.",
  "..tggttggttggtt.",
  "..ttttttttttttt.",
  "...tttttttttt...",
  "...tggggggggt...",
  "...tttttttttt...",
  "....tt....tt....",
  "....tt....tt....",
  "....kk....kk....",
], { t: '#241f33', g: '#f0c75e', k: '#0c0b10' });

// THE PARTY OF THE SECOND PART. The version of you that hit the other key.
// Split down the middle — street gold on one side, floor blue on the other,
// with the seam drawn as a hard black line, because that is the only honest
// picture of a person who is counsel and party at the same time. Which half is
// which does not depend on the key you pressed, and that is deliberate.
SPR.yourself = makeSprite([
  "................",
  ".....aa||bb.....",
  "....aaa||bbb....",
  "....aaa||bbb....",
  "....aaa||bbb....",
  "....aka||bkb....",
  "....aaa||bbb....",
  ".....aa||bb.....",
  "......a||b......",
  "....aaaa||bbbb..",
  "...aaaaa||bbbbb.",
  "...aaaaa||bbbbb.",
  "...aaaa.||.bbbb.",
  ".....aa.||.bb...",
  ".....aa.||.bb...",
  ".....kk.||.kk...",
], { a: '#f0c75e', b: '#3d5570', k: K, '|': '#0c0b10' });

// ---- Hon. M. Bane ---------------------------------------------------------
// Named in five places since Phase 1 and never seen. Black robe, white bib,
// grey the whole way. He is not waiting for anything — he is presiding.
SPR.bane = makeSprite([
  "................",
  "....gggggggg....",
  "...gggggggggg...",
  "...gffffffffg...",
  "....ffffffff....",
  "....fkffffkf....",
  "....ffffffff....",
  ".....ffffff.....",
  "....wwwffwww....",
  "...rrrrwwrrrr...",
  "..rrrrrwwrrrrr..",
  "..rrrrrrrrrrrr..",
  "..rrrrrrrrrrrr..",
  "...rrrrrrrrrr...",
  "...rrrrrrrrrr...",
  "....kk....kk....",
], { g: '#c8c4bc', f: SKIN, k: K, w: WHT, r: '#16151c' });

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
