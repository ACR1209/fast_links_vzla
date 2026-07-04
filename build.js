#!/usr/bin/env node
'use strict';

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// --- Config (override via env) ---
const LINKTREE_URL = process.env.LINKTREE_URL || 'https://linktr.ee/AidLinkTerremotosVenezuela';
const TITLE = process.env.SITE_TITLE || 'AidLinksVenezuela';
const SUBTITLE = process.env.SITE_SUBTITLE || 'Recursos digitales tras el terremoto 🇻🇪 — Reporta, Busca, Encuentra personas y mascotas; Centros de Acopio, Listados y Más.';
const OUT_DIR = path.join(__dirname, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'index.html');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        } else {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function readDir(dir) {
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith('.'))
    .sort()
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function minifyJS(js) {
  return js
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLinktree(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('__NEXT_DATA__ not found in Linktree page');
  const links = JSON.parse(m[1]).props.pageProps.links;

  const groups = links
    .filter(l => l.type === 'GROUP')
    .sort((a, b) => a.position - b.position);

  const byParent = Object.create(null);
  for (const l of links) {
    if (l.type === 'GROUP' || !l.url) continue;
    if (/aidlinksvenezuela\.org/i.test(l.url)) continue;
    const pid = l.parent ? l.parent.id : '';
    (byParent[pid] || (byParent[pid] = [])).push(l);
  }

  return groups
    .filter(g => byParent[g.id])
    .map(g => ({
      cat: g.title.trim(),
      links: byParent[g.id]
        .sort((a, b) => a.position - b.position)
        .map(l => ({ name: l.title.trim(), target: l.url })),
    }));
}

async function build() {
  console.log(`Fetching ${LINKTREE_URL}`);

  let groups = [];
  try {
    const html = await fetch(LINKTREE_URL);
    groups = parseLinktree(html);
    const total = groups.reduce((n, g) => n + g.links.length, 0);
    console.log(`Fetched ${total} links in ${groups.length} categories`);
  } catch (err) {
    console.error(`Linktree fetch failed: ${err.message}`);
    console.error('Building with empty links list.');
  }

  const css = minifyCSS(readDir(path.join(__dirname, 'css')));
  const js = minifyJS(readDir(path.join(__dirname, 'js')));
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

  const html = template
    .replace('{{CSS}}', css)
    .replace('{{JS}}', js)
    .replace(/{{TITLE}}/g, TITLE)
    .replace('{{SUBTITLE}}', SUBTITLE)
    .replace('{{LINKS_JSON}}', JSON.stringify(groups));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  const bytes = Buffer.byteLength(html, 'utf8');
  console.log(`Built: ${OUT_FILE} (${bytes} bytes / ${(bytes / 1024).toFixed(1)} KB)`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
