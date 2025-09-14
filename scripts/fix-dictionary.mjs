#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'genz-dictionary.json';
const DST_DIR = 'dist';
const DST = path.join(DST_DIR, 'genz-dictionary.json');

const WS_RX = /[\u00A0\u200B\u200C\u200D\uFEFF]/g; // NBSP, ZWSP, BOM, etc.

function normKey(s) {
  return String(s).replace(WS_RX, ' ').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'");
}

function cleanStr(s) {
  return String(s ?? '')
    .replace(/\r/g, '')
    .replace(WS_RX, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

const raw = fs.readFileSync(SRC, 'utf8');
let data = JSON.parse(raw);
if (!Array.isArray(data)) throw new Error('Top-level must be an array');

const map = new Map();
let kept = 0, dropped = 0;

for (const it of data) {
  if (!it || typeof it !== 'object') { dropped++; continue; }

  const term = cleanStr(it.term);
  const meaning = cleanStr(it.meaning);
  const example = cleanStr(it.example || '');
  const source = cleanStr(it.source || '');

  // Drop items with missing core fields (these caused your CI failures)
  if (!term || !meaning) { dropped++; continue; }

  const key = normKey(term);
  if (!map.has(key)) {
    map.set(key, { term, meaning, example, source });
    kept++;
  } else {
    // Prefer longer meaning/example
    const prev = map.get(key);
    const better =
      (meaning.length > (prev.meaning || '').length) ||
      (meaning.length === (prev.meaning || '').length && example.length > (prev.example || '').length)
        ? { term, meaning, example, source }
        : prev;
    map.set(key, better);
  }
}

fs.mkdirSync(DST_DIR, { recursive: true });
const out = [...map.values()].sort((a,b)=> a.term.localeCompare(b.term, 'en'));
fs.writeFileSync(DST, JSON.stringify(out, null, 2));
console.log(`Cleaned ${data.length} → kept ${kept}, dropped ${dropped}. Wrote ${DST}`);
if (fs.existsSync('translator-mapping.json')) {
  fs.copyFileSync('translator-mapping.json', path.join(DST_DIR, 'translator-mapping.json'));
  console.log('Copied translator-mapping.json → dist/');
}
