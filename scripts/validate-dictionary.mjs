#!/usr/bin/env node
// Tiny validator for genz-dictionary.json
// Usage: node scripts/validate-dictionary.mjs genz-dictionary.json
import fs from 'node:fs';
import process from 'node:process';

const file = process.argv[2] || 'genz-dictionary.json';
let raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (e) {
  console.error(`✗ Cannot read ${file}: ${e.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`✗ Invalid JSON in ${file}: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error('✗ Top-level JSON must be an array');
  process.exit(1);
}

const norm = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[’']/g, "'");

let errors = 0;
const seen = new Map();

data.forEach((it, i) => {
  const path = `#${i}`;
  if (it == null || typeof it !== 'object') {
    console.error(`✗ ${path}: item must be an object`);
    errors++;
    return;
  }

  // required: term, meaning
  const { term, meaning, example, source } = it;

  if (typeof term !== 'string' || !term.trim()) {
    console.error(`✗ ${path}: "term" must be a non-empty string`);
    errors++;
  } else {
    if (term !== term.trim()) {
      console.error(`✗ ${path}: "term" has leading/trailing spaces`);
      errors++;
    }
    if (/\n/.test(term)) {
      console.error(`✗ ${path}: "term" must not contain newlines`);
      errors++;
    }
    if (term.length > 80) {
      console.error(`✗ ${path}: "term" too long (${term.length} chars > 80)`);
      errors++;
    }
    const key = norm(term);
    if (seen.has(key)) {
      const prev = seen.get(key);
      console.error(`✗ ${path}: duplicate "term" (case-insensitive) with ${prev} → "${term}"`);
      errors++;
    } else {
      seen.set(key, path);
    }
  }

  if (typeof meaning !== 'string' || !meaning.trim()) {
    console.error(`✗ ${path}: "meaning" must be a non-empty string`);
    errors++;
  } else {
    const m = meaning.trim();
    if (m.length < 3) {
      console.error(`✗ ${path}: "meaning" too short`);
      errors++;
    }
    if (m.length > 300) {
      console.error(`✗ ${path}: "meaning" too long (${m.length} chars > 300)`);
      errors++;
    }
  }

  if (example != null && typeof example !== 'string') {
    console.error(`✗ ${path}: "example" must be a string if provided`);
    errors++;
  }
  if (source != null && typeof source !== 'string') {
    console.error(`✗ ${path}: "source" must be a string if provided`);
    errors++;
  }

  // warn for unexpected keys (non-fatal)
  const allowed = new Set(['term', 'meaning', 'example', 'source']);
  Object.keys(it).forEach((k) => {
    if (!allowed.has(k)) {
      console.warn(`! ${path}: unexpected key "${k}" (will be ignored by the extension)`);
    }
  });
});

if (errors) {
  console.error(`\n✗ Validation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log(`✓ ${file} is valid. Entries: ${data.length}`);
