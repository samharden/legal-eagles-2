#!/usr/bin/env node
// ============================== BUNDLER ==============================
// Emits dist/index.html: one self-contained file you can double-click, email,
// or drop on itch.io. Development runs the ES modules straight off a local
// server; this exists so LE1's best property — "open the file, play the game" —
// survives the move to modules.
//
// Strategy: topologically order the import graph, strip the import/export
// syntax, and concatenate into ONE module scope. That is only sound under two
// constraints, so the script enforces both and fails loudly:
//
//   1. No circular imports.
//   2. No duplicate top-level declaration names across modules.
//
// Namespace imports (`import * as X from …`) are rebuilt as an object literal
// of that module's exported bindings after its body.
//
// Usage:  node tools/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import './check.mjs';   // city geometry is validated before anything is emitted
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => relative(ROOT, p).split('\\').join('/');

const RE_NAMED = /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?\s*$/;
const RE_NS = /^\s*import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]\s*;?\s*$/;
const RE_BARE = /^\s*import\s*['"]([^'"]+)['"]\s*;?\s*$/;
const RE_EXPORT_DECL = /^(\s*)export\s+(const|let|var|function|class|async\s+function)\s+/;
const RE_EXPORT_LIST = /^\s*export\s*\{[^}]*\}\s*;?\s*$/;

const modules = new Map();   // abspath -> { src, deps:[abspath], ns:[{name,path}], exports:[] }

function load(abs) {
  if (modules.has(abs)) return modules.get(abs);
  const src = readFileSync(abs, 'utf8');
  const dir = dirname(abs);
  const deps = [], ns = [], exports = [];
  const out = [];

  for (const line of src.split('\n')) {
    let m;
    if ((m = line.match(RE_NAMED))) { deps.push(resolve(dir, m[2])); continue; }
    if ((m = line.match(RE_NS))) {
      const p = resolve(dir, m[2]);
      deps.push(p); ns.push({ name: m[1], path: p });
      continue;
    }
    if ((m = line.match(RE_BARE))) { deps.push(resolve(dir, m[1])); continue; }
    if (RE_EXPORT_LIST.test(line)) continue;
    if ((m = line.match(RE_EXPORT_DECL))) {
      const after = line.slice(m[0].length);
      const name = (after.match(/^(\w+)/) || [])[1];
      if (name) exports.push(name);
      out.push(m[1] + m[2] + ' ' + after);
      continue;
    }
    if (/^\s*["']use strict["'];\s*$/.test(line)) continue;
    out.push(line);
  }

  const mod = { abs, src: out.join('\n'), deps, ns, exports };
  modules.set(abs, mod);
  for (const d of deps) load(d);
  return mod;
}

function topo(entries) {
  const order = [], state = new Map();
  const visit = (abs, stack) => {
    const s = state.get(abs);
    if (s === 'done') return;
    if (s === 'busy') {
      throw new Error('circular import:\n  ' + [...stack, abs].map(rel).join('\n  -> '));
    }
    state.set(abs, 'busy');
    for (const d of modules.get(abs).deps) visit(d, [...stack, abs]);
    state.set(abs, 'done');
    order.push(abs);
  };
  for (const e of entries) visit(e, []);
  return order;
}

/**
 * A namespace alias (`import * as Clock`) becomes a generated `const Clock`
 * in the flat scope. If a module also EXPORTS a binding of that name, the
 * bundle has two `const Clock` and dies with a parse error before a single
 * line runs — silently, because nothing has executed to log anything. That
 * shipped once. It does not get to ship twice.
 */
function checkAliasCollisions(order) {
  const declared = new Map();
  const RE_DECL = /^(?:const|let|var|function|class|async\s+function)\s+(\w+)/;
  for (const abs of order)
    for (const line of modules.get(abs).src.split('\n')) {
      const m = line.match(RE_DECL);
      if (m && !declared.has(m[1])) declared.set(m[1], abs);
    }
  const bad = [];
  for (const abs of order)
    for (const n of modules.get(abs).ns)
      if (declared.has(n.name))
        bad.push(`  namespace import "${n.name}" in ${rel(abs)} collides with a top-level `
          + `declaration of the same name in ${rel(declared.get(n.name))}`);
  if (bad.length) {
    throw new Error('namespace alias collides with a real binding:\n' + bad.join('\n')
      + '\n  Fix: rename the export, or use named imports instead of `import * as`.');
  }
}

function checkDuplicates(order) {
  const seen = new Map();
  // anchored at column 0 on purpose: only MODULE-scope declarations collide
  // when the modules are concatenated. Anything indented is inside a function
  // or block and keeps its own scope.
  const RE_DECL = /^(?:const|let|var|function|class|async\s+function)\s+(\w+)/;
  const dupes = [];
  for (const abs of order) {
    for (const line of modules.get(abs).src.split('\n')) {
      const m = line.match(RE_DECL);
      if (!m) continue;
      const name = m[1];
      if (seen.has(name) && seen.get(name) !== abs)
        dupes.push(`  ${name}  —  ${rel(seen.get(name))}  vs  ${rel(abs)}`);
      else seen.set(name, abs);
    }
  }
  if (dupes.length) {
    throw new Error('duplicate top-level names (flat concat needs them unique):\n' + dupes.join('\n'));
  }
}

// ---- go --------------------------------------------------------------------
const htmlPath = resolve(ROOT, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

// Every id the source markup declares, taken BEFORE anything is stripped. The
// build's worst failure mode is losing markup quietly — a stripping regex that
// reaches too far leaves a file that still parses, still opens and is missing
// something you only notice by playing it. The ids are the cheapest census of
// "is the page still all there".
const idsIn = s => new Set([...s.matchAll(/<[a-z][\w-]*\s[^>]*\bid="([^"]+)"/g)].map(m => m[1]));
const srcIds = idsIn(html);

const tagRe = /<script\s+type="module"\s+src="([^"?]+)(?:\?[^"]*)?"\s*><\/script>\s*/g;
const entries = [...html.matchAll(tagRe)].map(m => resolve(ROOT, m[1]));
if (!entries.length) throw new Error('no <script type="module" src=…> tags found in index.html');

for (const e of entries) load(e);
const order = topo(entries);
checkDuplicates(order);
checkAliasCollisions(order);

// Emit each module in dependency order, and immediately after a module's body
// emit any namespace alias (`import * as X`) that points at it — so the alias
// exists before the first consumer runs.
const parts = [];
const aliased = new Set();
for (const abs of order) {
  parts.push(`\n/* ==== ${rel(abs)} ==== */`, modules.get(abs).src);
  for (const other of order) {
    for (const n of modules.get(other).ns) {
      if (n.path !== abs || aliased.has(n.name)) continue;
      aliased.add(n.name);
      parts.push(`const ${n.name} = { ${modules.get(abs).exports.join(', ')} };`);
    }
  }
}

const bundle = '"use strict";\n' + parts.join('\n');

html = html.replace(tagRe, '');

// Anything marked `data-dev-only` belongs to the served source tree and must not
// ship. Today that is one thing: the file:// guard, which tells a player who
// double-clicked the DEV index.html to open dist/index.html instead. Left in, it
// would fire in dist/index.html — which is opened over file:// by design — and
// tell the player to go and open the file they already have open.
// The leading `<!--…-->` clause takes the tag's explanatory comment with it: it
// is about a mechanism that does not exist in the shipped file, so leaving it
// there would document a thing dist cannot do.
// The comment body is `(?!-->)`-tempered so the clause can only ever eat ONE
// comment — the one against the tag. Written as `[\s\S]*?` it looked like it
// stopped at the first `-->`, and lazy matching does try that first, but on
// failure it BACKTRACKS to a later one: adding an ordinary comment anywhere
// earlier in the body made the clause swallow the comment, the tag, and every
// element in between. dist/index.html shipped with no dialogue box and no
// casefile, and the emitted bundle still parsed, so nothing complained.
const devOnlyRe = /(?:<!--(?:(?!-->)[\s\S])*-->\s*)?<script\s+data-dev-only\s*>[\s\S]*?<\/script>\s*/g;
const devOnly = (html.match(devOnlyRe) || []).length;
html = html.replace(devOnlyRe, '');
// Anchored on the TAG, not the bare string — the first version of this check
// matched the word inside its own explanatory comment and failed every build.
if (/<script\s+data-dev-only/.test(html))
  throw new Error('a data-dev-only tag survived into the bundle — check the tag is exactly <script data-dev-only>');
// The replacement MUST be a function. With a replacement *string*, JS expands
// `$&`, "$'", '$`' and `$$` inside it — and the bundle is full of `${...}` and
// `$$` in template literals. That silently corrupts the shipped copy while the
// source still parses perfectly, which is exactly as fun to debug as it sounds.
html = html.replace('</body>', () => `<script>\n${bundle}\n</script>\n</body>`);

// Gate on the EMBEDDED script, not the pre-insertion bundle, so insertion bugs
// are caught too. A syntax error here produces a page that loads, renders
// nothing and logs nothing — the most expensive kind of broken.
const a = html.lastIndexOf('<script>'), b = html.lastIndexOf('</script>');
try { new Function(html.slice(a + 8, b)); }
catch (e) { throw new Error(`emitted bundle does not parse: ${e.message}`); }

// Nothing above this line notices missing MARKUP. The stripping regexes are the
// only things that delete any, so if an id went in and did not come out, one of
// them reached past its tag.
const outIds = idsIn(html);
const lostIds = [...srcIds].filter(id => !outIds.has(id));
if (lostIds.length)
  throw new Error('markup lost between index.html and dist: ' + lostIds.join(', ')
    + '\n(a stripping regex ate more than its own tag)');

mkdirSync(resolve(ROOT, 'dist'), { recursive: true });
writeFileSync(resolve(ROOT, 'dist/index.html'), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html  ${kb} KB  (${order.length} modules, ${devOnly} dev-only tag${devOnly === 1 ? '' : 's'} stripped)`);
console.log('modules in order:\n  ' + order.map(rel).join('\n  '));
