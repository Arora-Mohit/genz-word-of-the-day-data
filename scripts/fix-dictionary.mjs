#!/usr/bin/env node
// Reads genz-dictionary.json at repo root → cleans + de-dupes → writes dist/genz-dictionary.json
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'genz-dictionary.json';
const DST_DIR = 'dist';
const DST = path.join(DST_DIR, 'genz-dictionary.json');

function normKey(s) {
  return String(s).toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

function cleanStr(s) {
  return String(s ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

const raw = fs.readFileSync(SRC, 'utf8');
let data = JSON.parse(raw);
if (!Array.isArray(data)) throw new Error('Top-level must be an array');

const map = new Map();
let kept = 0;
for (const it of data) {
  if (!it || typeof it !== 'object') continue;
  const term = cleanStr(it.term);
  const meaning = cleanStr(it.meaning);
  const example = cleanStr(it.example || '');
  const source = cleanStr(it.source || '');

  if (!term || !meaning) continue; // will be flagged by validator anyway

  const key = normKey(term);
  if (!map.has(key)) {
    map.set(key, { term, meaning, example, source });
    kept++;
  } else {
    // Simple preference: keep the one with longer meaning/example
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
fs.writeFileSync(DST, JSON.stringify([...map.values()].sort((a,b)=> a.term.localeCompare(b.term,'en')), null, 2));
console.log(`Cleaned ${data.length} → ${kept} entries`);
if (fs.existsSync('translator-mapping.json')) {
  fs.copyFileSync('translator-mapping.json', path.join(DST_DIR, 'translator-mapping.json'));
  console.log('Copied translator-mapping.json → dist/');
}
