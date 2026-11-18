#!/usr/bin/env node
// Internal link checker for the trust-surface-ratchet field guide.
//
// Purpose: verify that every relative markdown link resolves to a file or
// directory on disk. This keeps the guide navigable as files move or get
// renamed. External links (http, https, mailto) and pure in-page anchors are
// intentionally not checked, since network checks are flaky and anchor
// resolution would require full heading parsing.
//
// Zero dependencies. Runs with plain `node scripts/check-links.mjs`.
// Exit code 0 when all links resolve, 1 when any relative link is broken.

import { fileURLToPath } from 'node:url';

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const EXCLUDED_DIRS = new Set(['.git', '.lake', 'node_modules']);

// Inline markdown links and images: [text](target) and ![alt](target).
const LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g;

function walk(dir, acc) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      walk(full, acc);
    } else if (extname(name) === '.md') {
      acc.push(relative(ROOT, full));
    }
  }
  return acc;
}

// Extract the raw target from a markdown link body, dropping any optional
// title (target "Title") and angle-bracket wrapping (<target>).
function cleanTarget(raw) {
  let t = raw.trim();
  if (t.startsWith('<') && t.includes('>')) {
    t = t.slice(1, t.indexOf('>'));
  }
  // A title, if present, is separated by whitespace after the URL.
  const space = t.search(/\s/);
  if (space !== -1) t = t.slice(0, space);
  return t.trim();
}

function isExternal(t) {
  return /^(?:https?:|mailto:|tel:)/i.test(t);
}

function checkFile(file) {
  const broken = [];
  const lines = readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/);
  let inFence = false;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^(?:```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    // Strip inline code spans so link syntax shown as an example is not
    // mistaken for a real link.
    const scanned = line.replace(/`[^`]*`/g, '');
    LINK_RE.lastIndex = 0;
    let m;
    while ((m = LINK_RE.exec(scanned)) !== null) {
      const target = cleanTarget(m[1]);
      if (!target || target.startsWith('#')) continue;
      if (isExternal(target)) continue;
      const pathPart = decodeURIComponent(target.split('#')[0]);
      if (!pathPart) continue;
      const resolved = resolve(dirname(join(ROOT, file)), pathPart);
      if (!existsSync(resolved)) {
        broken.push({ file, line: i + 1, target });
      }
    }
  });
  return broken;
}

const files = walk(ROOT, []);
let broken = [];
for (const file of files) broken = broken.concat(checkFile(file));

if (broken.length > 0) {
  console.error(`Link check FAILED: ${broken.length} broken internal link(s).\n`);
  for (const b of broken) {
    console.error(`  ${b.file}:${b.line}  ->  ${b.target}`);
  }
  process.exit(1);
}

console.log(`Link check passed: scanned ${files.length} markdown files, all internal links resolve.`);
