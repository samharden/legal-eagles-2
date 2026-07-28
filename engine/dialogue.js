"use strict";
// ============================== DIALOGUE ==============================
// DOM, on every platform — the same call LE2 made for the HUD. LE1 drew dialogue
// on the canvas for desktop and rebuilt it in DOM for mobile, which meant two
// layouts, two hit-test paths and two sets of wrapping bugs. Cases are talky;
// this UI will carry most of the game's words, and it should exist once.
//
// A tree is data:
//   { who, spr, start, nodes: { id: { text, choices?, to?, fx?, who?, spr? } } }
//
// A choice may carry `if` (a predicate) and `tag` (the bracketed unlock label,
// e.g. [EVIDENCE]). A gated choice the player cannot yet take is rendered
// DISABLED rather than hidden when `showLocked` is set — knowing a door exists
// is most of what makes an investigation feel like one.

import { SPR } from './sprites.js';

let dlgRoot, elWho, elText, elChoices, elPortrait;

function dlgBuild() {
  if (dlgRoot) return;
  dlgRoot = document.getElementById('dlg');
  elWho = document.getElementById('dWho');
  elText = document.getElementById('dText');
  elChoices = document.getElementById('dChoices');
  elPortrait = document.getElementById('dPortrait');
}

export const Dialogue = {
  active: false,
  tree: null,
  node: null,
  sel: 0,
  onClose: null,
  _choices: [],

  open(tree, onClose) {
    dlgBuild();
    this.tree = tree;
    this.onClose = onClose || null;
    this.active = true;
    dlgRoot.classList.add('open');
    this.go(tree.start || 'start');
  },

  go(id) {
    const node = this.tree.nodes[id];
    if (!node) return this.close();
    this.node = node;
    this.sel = 0;
    if (node.fx) node.fx();
    this.render();
  },

  render() {
    const n = this.node, t = this.tree;
    elWho.textContent = n.who || t.who || '';
    elText.textContent = typeof n.text === 'function' ? n.text() : n.text;

    // portrait: the 16x16 sprite blown up, smoothing off
    const sprName = n.spr || t.spr;
    const spr = SPR[sprName];
    const g = elPortrait.getContext('2d');
    g.clearRect(0, 0, elPortrait.width, elPortrait.height);
    if (spr) {
      g.imageSmoothingEnabled = false;
      g.drawImage(spr, 0, 0, elPortrait.width, elPortrait.height);
    }

    // choices — evaluate gates now, so `if` can read live game state
    elChoices.innerHTML = '';
    this._choices = [];
    const raw = typeof n.choices === 'function' ? n.choices() : n.choices;

    if (raw && raw.length) {
      for (const c of raw) {
        const ok = !c.if || c.if();
        if (!ok && !c.showLocked) continue;
        const b = document.createElement('button');
        b.className = 'dchoice' + (ok ? '' : ' locked');
        const idx = ok ? this._choices.length + 1 : null;
        b.innerHTML = `<span class="dnum">${idx ? idx + '.' : '—'}</span>`
          + (c.tag ? `<span class="dtag">[${c.tag}]</span> ` : '')
          + `<span class="dlabel">${c.label}</span>`
          + (!ok && c.lockedNote ? `<span class="dlock">${c.lockedNote}</span>` : '');
        if (ok) {
          const i = this._choices.length;
          this._choices.push(c);
          b.addEventListener('click', () => this.choose(i));
        } else b.disabled = true;
        elChoices.appendChild(b);
      }
      this.highlight();
    } else {
      const b = document.createElement('button');
      b.className = 'dchoice dcont';
      b.innerHTML = `<span class="dlabel">${n.to ? 'Continue' : 'End conversation'}</span>`;
      b.addEventListener('click', () => this.advance());
      elChoices.appendChild(b);
      this._choices = [];
    }
  },

  highlight() {
    const btns = [...elChoices.querySelectorAll('.dchoice:not(.locked)')];
    btns.forEach((b, i) => b.classList.toggle('on', i === this.sel));
    if (btns[this.sel]) btns[this.sel].scrollIntoView({ block: 'nearest' });
  },

  move(d) {
    if (!this._choices.length) return;
    this.sel = (this.sel + d + this._choices.length) % this._choices.length;
    this.highlight();
  },

  choose(i) {
    const c = this._choices[i];
    if (!c) return;
    if (c.fx) c.fx();
    if (c.to) this.go(c.to);
    else this.close();
  },

  advance() {
    if (this._choices.length) { this.choose(this.sel); return; }
    if (this.node.to) this.go(this.node.to);
    else this.close();
  },

  close() {
    if (!this.active) return;
    this.active = false;
    dlgRoot.classList.remove('open');
    const cb = this.onClose;
    this.tree = null; this.node = null; this.onClose = null; this._choices = [];
    if (cb) cb();
  },
};
