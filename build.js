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
const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const PB_COLLECTION = process.env.PB_COLLECTION || 'links';
const TITLE = process.env.SITE_TITLE || 'Links';
const SUBTITLE = process.env.SITE_SUBTITLE || '';
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

function getCategoryName(record) {
  const exp = record.expand && record.expand.categories;
  if (!exp) return '';
  if (Array.isArray(exp)) return exp[0] ? exp[0].name : '';
  return exp.name || '';
}

function groupByCategory(records) {
  const order = [];
  const map = Object.create(null);
  for (const r of records) {
    const cat = getCategoryName(r);
    if (!map[cat]) { map[cat] = []; order.push(cat); }
    map[cat].push({ name: r.name, target: r.target });
  }
  return order.map(cat => ({ cat, links: map[cat] }));
}

async function build() {
  const url = `${PB_URL}/api/collections/${PB_COLLECTION}/records?perPage=200&sort=+categories.name,+name&expand=categories`;
  console.log(`Fetching ${url}`);

  let groups = [];
  try {
    const raw = await fetch(url);
    const data = JSON.parse(raw);
    const records = data.items || data.docs || [];
    groups = groupByCategory(records);
    const total = records.length;
    console.log(`Fetched ${total} links in ${groups.length} categories`);
  } catch (err) {
    console.error(`PocketBase fetch failed: ${err.message}`);
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
