"use strict";
// ============================== LAYERS ==============================
// The two dressings of one city. A layer owns colour, light, music and the
// content sets the regions expose under `layers[id]`. Geometry belongs to the
// region; everything else belongs here.
//
// THE STREET is Path A (SEND — the Solo Shingle). THE FLOOR is Path B (DELETE —
// Was This All A Dream?). They share every wall.

export const LAYERS = {
  street: {
    id: 'street',
    name: 'THE STREET',
    music: 'street',
    // paint class -> colour
    pal: {
      ground: '#2b2740', grass: '#2f4a35', road: '#1c1a2a', steps: '#3d3856',
      door: '#8a6a3a', build: '#4a3f63', glass: '#5e7fa8', tree: '#3f6b45', prop: '#5a4a6e',
    },
    edge: '#71619a',        // top-edge highlight on solid tiles
    grid: 'rgba(0,0,0,0.16)',
    bg: '#171327',
    mood: { vign: 0.18, tint: null, pulse: 0 },
    // ambient motes: dust in daylight
    motes: { n: 22, color: 'rgba(240,199,94,0.10)', drift: 14 },
  },
  floor: {
    id: 'floor',
    name: 'THE FLOOR',
    music: 'floor',
    pal: {
      ground: '#1c1828', grass: '#22222a', road: '#14121e', steps: '#241f33',
      door: '#4a3a2a', build: '#2e2740', glass: '#2b3a48', tree: '#33303c', prop: '#332c44',
    },
    edge: '#463c66',
    grid: 'rgba(0,0,0,0.24)',
    bg: '#0b0912',
    // this layer's regions are dark until somebody bills against them
    dark: true,
    // the building breathes — a slow vignette pulse, borrowed from LE1's Vault
    mood: { vign: 0.62, tint: 'rgba(30,45,60,0.16)', pulse: 0.10 },
    motes: { n: 34, color: 'rgba(150,160,190,0.10)', drift: 6 },
  },
};

export const layerOf = id => LAYERS[id] || LAYERS.street;
