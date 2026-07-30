#!/usr/bin/env node
// ============================== DEV SERVER ==============================
// python3 -m http.server was fine for LE1, where every script was a <script src>
// that could carry a ?v=N cache-buster. ES modules import each other by literal
// path, so a version on the entry never reaches engine/stage.js — and Chrome
// keeps a module graph across reloads even under `Cache-Control: no-store`. You
// end up debugging code that is not running, which cost an hour once already.
//
// So the server rewrites module specifiers on the way out, stamping every
// relative import with ?v=<max mtime across the source tree>. Change any file
// and every module URL changes, so nothing can be stale. The files on disk keep
// plain relative imports, which is what tools/build.mjs needs.
//
// Usage:  node tools/serve.mjs [port]

import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8142;
const SRC_DIRS = ['engine', 'game', 'dev'];

// newest mtime across the source tree — the cache token
async function sourceToken() {
  let newest = 0;
  const walk = async dir => {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.js')) {
        const s = await stat(p);
        if (s.mtimeMs > newest) newest = s.mtimeMs;
      }
    }
  };
  for (const d of SRC_DIRS) await walk(join(ROOT, d));
  try { const s = await stat(join(ROOT, 'index.html')); if (s.mtimeMs > newest) newest = s.mtimeMs; } catch {}
  return Math.floor(newest).toString(36);
}

// stamp relative import specifiers inside a module
function stampModule(text, v) {
  return text.replace(
    /(\bfrom\s*|\bimport\s*)(['"])(\.\.?\/[^'"?]+?)(?:\?[^'"]*)?\2/g,
    (_, kw, q, spec) => `${kw}${q}${spec}?v=${v}${q}`);
}
// stamp the entry <script type="module" src="…">
function stampHtml(text, v) {
  return text.replace(
    /(<script\s+type="module"\s+src=")([^"?]+)(?:\?[^"]*)?(")/g,
    (_, a, src, b) => `${a}${src}?v=${v}${b}`);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';

    // keep the served path inside ROOT
    const file = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

    const info = await stat(file);
    if (info.isDirectory()) { res.writeHead(404).end('not found'); return; }

    const ext = extname(file);
    let body = await readFile(file);
    if (ext === '.js' || ext === '.html') {
      const v = await sourceToken();
      const text = body.toString('utf8');
      body = Buffer.from(ext === '.js' ? stampModule(text, v) : stampHtml(text, v), 'utf8');
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(String(e.code || e));
  }
// Bound to loopback on purpose. Node's default with no host is 0.0.0.0 — every
// interface — which puts the whole project directory on the local network the
// moment you work from a coffee shop. Nothing here is meant to be reachable by
// anyone but you; the traversal guard above keeps the server inside ROOT, and
// this keeps it inside the machine.
}).listen(PORT, '127.0.0.1', () => console.log(`LE2 dev server  http://localhost:${PORT}  (no-store)`));
