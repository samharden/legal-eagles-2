"use strict";
// ============================== AUDIO ==============================
// Synthesized via Web Audio — no asset files. The context is created on the
// first user gesture (autoplay policy). Ported from LE1 with LE2's songs.

export const AU = { ctx: null, master: null, sfx: null, mus: null, on: true, step: 0, nextT: 0, song: null };

export function audioInit() {
  if (AU.ctx) return;
  const C = new (window.AudioContext || window.webkitAudioContext)();
  AU.ctx = C;
  AU.master = C.createGain(); AU.master.gain.value = AU.on ? 0.5 : 0; AU.master.connect(C.destination);
  AU.sfx = C.createGain(); AU.sfx.gain.value = 0.8; AU.sfx.connect(AU.master);
  AU.mus = C.createGain(); AU.mus.gain.value = 0.3; AU.mus.connect(AU.master);
  AU.echo = C.createGain(); AU.echo.gain.value = 0.3;
  AU.echoDelay = C.createDelay(1.0); AU.echoDelay.delayTime.value = 0.3;
  const fb = C.createGain(); fb.gain.value = 0.38;
  const dampF = C.createBiquadFilter(); dampF.type = 'lowpass'; dampF.frequency.value = 2400;
  AU.echo.connect(AU.echoDelay); AU.echoDelay.connect(dampF); dampF.connect(fb); fb.connect(AU.echoDelay);
  dampF.connect(AU.mus);
  AU.nextT = C.currentTime;
  if (C.state === 'suspended') C.resume();
}

// A controller-driven start is a synthetic click, not a user gesture, so the
// context can be born suspended — resume it on the first real interaction.
for (const ev of ['pointerdown', 'keydown', 'touchstart'])
  window.addEventListener(ev, () => { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); }, { capture: true });

function tone({ f = 440, f2 = 0, type = 'square', t = 0.1, vol = 0.15, when = 0, dest = null }) {
  if (!AU.ctx || !AU.on) return;
  const C = AU.ctx, o = C.createOscillator(), g = C.createGain(), st = C.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(f, st);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), st + t);
  g.gain.setValueAtTime(vol, st);
  g.gain.exponentialRampToValueAtTime(0.001, st + t);
  o.connect(g); g.connect(dest || AU.sfx);
  o.start(st); o.stop(st + t + 0.02);
}
function noiseHit({ t = 0.15, vol = 0.2, fc = 1200, hp = 0, when = 0, dest = null }) {
  if (!AU.ctx || !AU.on) return;
  const C = AU.ctx, len = Math.max(1, Math.floor(C.sampleRate * t));
  const buf = C.createBuffer(1, len, C.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = C.createBufferSource(); src.buffer = buf;
  const flt = C.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = fc;
  const g = C.createGain(); g.gain.value = vol;
  src.connect(flt);
  let node = flt;
  if (hp) { const h = C.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; flt.connect(h); node = h; }
  node.connect(g); g.connect(dest || AU.sfx);
  src.start(C.currentTime + when);
}

export const SFX = {
  key() { tone({ f: 1400 + Math.random() * 300, t: 0.02, vol: 0.05, type: 'square' }); },
  ret() { tone({ f: 700, f2: 400, t: 0.06, vol: 0.07 }); noiseHit({ t: 0.04, vol: 0.05, fc: 3000 }); },
  send() { [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: 0.14, vol: 0.13, when: i * 0.08 })); },
  del() { tone({ f: 300, f2: 60, type: 'sawtooth', t: 0.5, vol: 0.16 }); noiseHit({ t: 0.4, vol: 0.12, fc: 500 }); },
  blip() { tone({ f: 740, t: 0.035, vol: 0.06 }); },
  page() { noiseHit({ t: 0.07, vol: 0.07, fc: 3600, hp: 900 }); },
  step() { noiseHit({ t: 0.04, vol: 0.03, fc: 900 }); },
  pick() { tone({ f: 660, t: 0.06, vol: 0.11 }); tone({ f: 990, t: 0.08, vol: 0.11, when: 0.06 }); },
  hit() { tone({ f: 200, f2: 90, t: 0.08, vol: 0.13 }); },
  melee() { noiseHit({ t: 0.06, vol: 0.1, fc: 2600 }); },
  die() { noiseHit({ t: 0.16, vol: 0.16, fc: 900 }); tone({ f: 300, f2: 60, type: 'triangle', t: 0.2, vol: 0.14 }); },
  dash() { tone({ f: 340, f2: 980, type: 'sawtooth', t: 0.12, vol: 0.07 }); noiseHit({ t: 0.1, vol: 0.06, fc: 2200 }); },
  door() { tone({ f: 180, f2: 120, type: 'triangle', t: 0.22, vol: 0.1 }); noiseHit({ t: 0.14, vol: 0.07, fc: 700 }); },
  // crossing a district line: a short establishing sting, not a fanfare
  district() { tone({ f: 294, t: 0.16, vol: 0.09 }); tone({ f: 440, t: 0.2, vol: 0.09, when: 0.13 }); tone({ f: 587, t: 0.26, vol: 0.07, when: 0.28 }); },
  boom() { noiseHit({ t: 0.5, vol: 0.28, fc: 500 }); tone({ f: 150, f2: 40, type: 'sawtooth', t: 0.5, vol: 0.18 }); },
  // One per practice area, because the five attacks should not sound alike —
  // a Hostile Takeover and an OBJECTION! are not the same noise and the player
  // should be able to tell which one they picked with their eyes shut.
  shoot(area) {
    switch (area) {
      case 'corp': tone({ f: 150, f2: 70, type: 'sawtooth', t: 0.22, vol: 0.14 }); noiseHit({ t: 0.12, vol: 0.09, fc: 700 }); break;
      case 'crim': for (let i = 0; i < 3; i++) tone({ f: 820, f2: 520, t: 0.05, vol: 0.06, when: i * 0.03 }); break;
      case 'ip': tone({ f: 620, f2: 1180, type: 'triangle', t: 0.16, vol: 0.08 }); break;
      case 'tax': [392, 494, 587, 740].forEach((f, i) => tone({ f, t: 0.16, vol: 0.09, when: i * 0.035 })); noiseHit({ t: 0.2, vol: 0.08, fc: 1800 }); break;
      default: tone({ f: 960, f2: 620, type: 'square', t: 0.06, vol: 0.09 }); noiseHit({ t: 0.04, vol: 0.05, fc: 3200 });
    }
  },
};

// ---- music ----------------------------------------------------------------
// Each song is a 4-bar composition (64 8th-note steps): bass/lead as MIDI note
// numbers (0 = rest), one pad chord per bar, 16-step drum strings ('x' = hit).
const NT = n => 440 * Math.pow(2, (n - 69) / 12);

export const SONGS = {
  // the resignation letter, 2:47 a.m. — one hand, no drums, a lot of space
  letter: {
    bpm: 68,
    chords: [[45, 48, 52], [43, 46, 50], [41, 45, 48], [40, 44, 47]],
    bass: [33, 0, 0, 0, 0, 0, 0, 0, 33, 0, 0, 0, 40, 0, 0, 0,
      31, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 38, 0, 0, 0,
      29, 0, 0, 0, 0, 0, 0, 0, 29, 0, 0, 0, 36, 0, 0, 0,
      28, 0, 0, 0, 0, 0, 0, 0, 28, 0, 0, 0, 35, 0, 0, 0],
    lead: [0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 71, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 67, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  // THE STREET — daylight, traffic, somebody's radio. Walking-pace and hopeful
  // in a way the player has not earned yet.
  street: {
    bpm: 108, swing: 0.14,
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...xx',
    chords: [[50, 54, 57], [48, 52, 55], [45, 49, 52], [47, 50, 54]],
    bass: [38, 0, 38, 0, 45, 0, 42, 0, 38, 0, 38, 0, 43, 0, 40, 0,
      36, 0, 36, 0, 43, 0, 40, 0, 36, 0, 36, 0, 40, 0, 43, 0,
      33, 0, 33, 0, 40, 0, 37, 0, 33, 0, 33, 0, 37, 0, 40, 0,
      35, 0, 35, 0, 42, 0, 38, 0, 35, 0, 38, 0, 40, 0, 42, 0],
    lead: [0, 0, 62, 0, 66, 0, 69, 0, 0, 0, 66, 0, 62, 0, 0, 0,
      0, 0, 64, 0, 67, 0, 71, 0, 0, 0, 67, 0, 64, 0, 0, 0,
      0, 0, 57, 0, 61, 0, 64, 0, 0, 0, 61, 0, 57, 0, 0, 0,
      0, 0, 59, 0, 62, 0, 66, 0, 69, 0, 66, 0, 62, 0, 59, 0],
  },
  // THE FLOOR — the same city, hollowed. Same chord roots as `street`, an
  // octave down, no drums, no lead until you earn one. The recognition is the
  // point: it should take a moment to notice it's the same tune.
  floor: {
    bpm: 72,
    chords: [[38, 42, 45], [36, 40, 43], [33, 37, 40], [35, 38, 42]],
    bass: [26, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 33, 0,
      24, 0, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 31, 0,
      21, 0, 0, 0, 0, 0, 0, 0, 21, 0, 0, 0, 0, 0, 28, 0,
      23, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 30, 0],
    lead: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 62, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 61, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

function kickAt(when, vol = 0.34) { tone({ f: 130, f2: 40, type: 'sine', t: 0.13, vol, when, dest: AU.mus }); }
function snareAt(when, vol = 0.11) {
  noiseHit({ t: 0.09, vol, fc: 4200, hp: 900, when, dest: AU.mus });
  tone({ f: 195, f2: 130, type: 'triangle', t: 0.07, vol: vol * 0.6, when, dest: AU.mus });
}
function hatAt(when, vol = 0.035) { noiseHit({ t: 0.03, vol, fc: 9500, hp: 5500, when, dest: AU.mus }); }
function bassNote(f, t, when, vol = 0.17) {
  const C = AU.ctx, st = C.currentTime + when;
  const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const flt = C.createBiquadFilter(); flt.type = 'lowpass';
  flt.frequency.setValueAtTime(Math.min(4000, f * 5), st);
  flt.frequency.exponentialRampToValueAtTime(Math.max(60, f * 1.5), st + t);
  const g = C.createGain(); g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + t);
  o.connect(flt); flt.connect(g); g.connect(AU.mus);
  o.start(st); o.stop(st + t + 0.02);
}
function leadNote(f, t, when, vol = 0.045) {
  const C = AU.ctx, st = C.currentTime + when, g = C.createGain();
  g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + t);
  for (const det of [-4, 4]) {
    const o = C.createOscillator(); o.type = 'square'; o.frequency.value = f; o.detune.value = det;
    o.connect(g); o.start(st); o.stop(st + t + 0.02);
  }
  g.connect(AU.mus); g.connect(AU.echo);
}
function padChord(notes, dur, when, vol = 0.02) {
  const C = AU.ctx, st = C.currentTime + when, g = C.createGain();
  g.gain.setValueAtTime(0.0001, st);
  g.gain.exponentialRampToValueAtTime(vol, st + dur * 0.3);
  g.gain.setValueAtTime(vol, st + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
  const flt = C.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1100;
  flt.connect(g); g.connect(AU.mus);
  for (const n of notes) for (const det of [-6, 6]) {
    const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NT(n); o.detune.value = det;
    o.connect(flt); o.start(st); o.stop(st + dur + 0.05);
  }
}

// `want` is the song id the game currently wants, or null for silence.
export function musicTick(want) {
  if (!AU.ctx || !AU.on) return;
  const C = AU.ctx;
  if (!want || !SONGS[want]) { AU.nextT = Math.max(AU.nextT, C.currentTime); AU.song = null; return; }
  if (want !== AU.song) {
    AU.song = want; AU.step = 0;
    const g = AU.mus.gain, now = C.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.0001, now + 0.2);
    g.linearRampToValueAtTime(0.3, now + 0.7);
    AU.nextT = Math.max(AU.nextT, now + 0.25);
  }
  const song = SONGS[AU.song];
  const spb = 60 / song.bpm / 2;
  AU.echoDelay.delayTime.value = Math.min(0.9, spb * 3);
  while (AU.nextT < C.currentTime + 0.15) {
    const s = AU.step, when = AU.nextT - C.currentTime + (s % 2 ? (song.swing || 0) * spb : 0);
    const b = song.bass[s % song.bass.length]; if (b) bassNote(NT(b), spb * 0.95, when);
    const l = song.lead[s % song.lead.length]; if (l) leadNote(NT(l), spb * 0.85, when);
    const d = s % 16;
    if (song.kick && song.kick[d] === 'x') kickAt(when);
    if (song.snare && song.snare[d] === 'x') snareAt(when);
    if (song.hat && song.hat[d] === 'x') hatAt(when);
    if (song.chords && d === 0) padChord(song.chords[(s >> 4) % song.chords.length], spb * 16, when);
    AU.step++; AU.nextT += spb;
  }
}

export function toggleMute() {
  if (!AU.ctx) return AU.on;
  AU.on = !AU.on;
  AU.master.gain.value = AU.on ? 0.5 : 0;
  if (AU.on) AU.nextT = AU.ctx.currentTime;
  return AU.on;
}
