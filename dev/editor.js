"use strict";
// ============================== MAP EDITOR (?edit=1) ==============================
// A painter for the ASCII tilemaps. Not a toy: authoring LE1's maps meant writing
// hline()/rectF() calls and reloading to see what you did, and that is the single
// biggest reason LE1 has six rooms. Here you paint on the running game and export
// rows you paste straight back into game/city.js.
//
// It edits the region's SOURCE rows (not the built grid), then forces a rebuild.
// That matters: the built grid has per-layer `sub` applied, so exporting from it
// would bake THE FLOOR's substitutions into THE STREET's geometry.

import { cv, DEV, TILE, W, H, cam, view } from '../engine/stage.js';
import { TILES } from '../engine/tilemap.js';

if (DEV && new URLSearchParams(location.search).get('edit') === '1') {
  const panel = document.createElement('div');
  panel.id = 'editor';
  panel.innerHTML = `
    <style>
      #editor { position:fixed; right:10px; top:10px; z-index:200; width:236px;
        background:rgba(14,11,22,.96); border:2px solid #6b5c8f; border-radius:8px;
        padding:10px; font-family:"Courier New",monospace; color:#e8e0f0; font-size:12px; }
      #editor h4 { color:#f0c75e; font-size:12px; letter-spacing:1px; margin-bottom:8px; }
      #editor .pal { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
      #editor .pal button { width:44px; height:34px; font-family:inherit; font-size:11px; cursor:pointer;
        background:#241d36; border:2px solid #3a3350; color:#e8e0f0; border-radius:4px; }
      #editor .pal button.on { border-color:#f0c75e; color:#f0c75e; }
      #editor .act { width:100%; margin-top:4px; padding:7px; font-family:inherit; font-size:12px;
        background:#f0c75e; color:#1a1626; border:none; border-radius:5px; font-weight:bold; cursor:pointer; }
      #editor textarea { width:100%; height:150px; margin-top:8px; font-family:inherit; font-size:10px;
        background:#0d0a14; color:#9be05e; border:1px solid #3a3350; border-radius:4px; padding:6px; display:none; }
      #editor .hint { color:#8d82a8; font-size:10px; line-height:1.5; margin-top:6px; }
    </style>
    <h4>MAP EDITOR</h4>
    <div class="pal" id="edPal"></div>
    <button class="act" id="edExport">EXPORT REGION ROWS</button>
    <textarea id="edOut" readonly></textarea>
    <div class="hint">Click/drag paints. The brush edits the region SOURCE, so export is always the real geometry.</div>
  `;
  document.body.appendChild(panel);

  let brush = '.';
  const pal = panel.querySelector('#edPal');
  for (const ch of Object.keys(TILES)) {
    const b = document.createElement('button');
    b.textContent = ch === ' ' ? '␠' : ch;
    b.title = TILES[ch].name;
    b.onclick = () => {
      brush = ch;
      [...pal.children].forEach(c => c.classList.remove('on'));
      b.classList.add('on');
    };
    if (ch === brush) b.classList.add('on');
    pal.appendChild(b);
  }

  const tileUnderPointer = e => {
    const r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (W / r.width);
    const sy = (e.clientY - r.top) * (H / r.height);
    return {
      tx: Math.floor((sx / view.zoom + cam.x) / TILE),
      ty: Math.floor((sy / view.zoom + cam.y) / TILE),
    };
  };

  function paint(e) {
    const LE2 = window.LE2;
    if (!LE2 || LE2.G.state !== 'play') return;
    const world = LE2.G.world;
    const { tx, ty } = tileUnderPointer(e);
    const built = world.regionAt(tx, ty);
    if (!built) return;
    const def = built.def;
    const lx = tx - def.ox, ly = ty - def.oy;
    const row = def.rows[ly];
    if (row[lx] === brush) return;
    def.rows[ly] = row.slice(0, lx) + brush + row.slice(lx + 1);
    world.evict(def.id);
    world.build(def.id);
  }

  let painting = false;
  cv.addEventListener('mousedown', e => { painting = true; paint(e); });
  cv.addEventListener('mousemove', e => { if (painting) paint(e); });
  window.addEventListener('mouseup', () => { painting = false; });

  panel.querySelector('#edExport').onclick = () => {
    const LE2 = window.LE2;
    if (!LE2 || LE2.G.state !== 'play') return;
    const p = LE2.G.player;
    const built = LE2.G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    if (!built) return;
    const out = panel.querySelector('#edOut');
    out.style.display = 'block';
    out.value = built.def.rows.map(r => `      '${r}',`).join('\n');
    out.select();
    console.log(`// ${built.def.id} rows\n` + out.value);
  };

  console.log('[LE2] map editor active — paint tiles, then EXPORT REGION ROWS.');
}
