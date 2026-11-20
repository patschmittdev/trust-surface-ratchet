#!/usr/bin/env node
// Neutrality guard for the trust-surface-ratchet field guide.
//
// Scans repository text and paths for environment-supplied private entries.
// Public pattern rules cover guide text files, excluding guide/scripts.
// NUL-containing files receive private checks only; unreadable entries fail closed.
// Exit codes: 0 clean, 1 findings or required list missing, 2 internal error.

import { fileURLToPath } from 'node:url';

import { readdirSync, readFileSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Directories that are never scanned.
// - node_modules: vendored code.
// - .git: version control internals.
const EXCLUDED_DIRS = new Set(['.git', 'node_modules']);

// Public pattern rules retain their original guide text surfaces.
// Private tokens also scan projections of NUL-containing files.
const TEXT_EXT = new Set(['.md', '.svg', '.json', '.yml', '.yaml', '.toml', '.txt']);
const TEXT_FILES = new Set(['LICENSE', '.gitignore']);

// Public rules have stable IDs and optional extension scopes.
// Private entries are never stored here and cannot be allowlisted.
// catalog-id is case sensitive and SVG-only to avoid lowercase hex colors.
const RULES = [
  { id: 'brand', re: /patschmitt\w*/gi },
  { id: 'tool-name', re: /\bcli_[a-z][a-z0-9_]*\b/gi },
  { id: 'source-path', sourcePaths: true },
  { id: 'catalog-id', re: /\bD\d{1,3}\b/g, exts: new Set(['.svg']) },
];

// Allowlist with a required reason, mirroring the guide's "raise the budget
// with a reason" rule. A hit is skipped only when its matched text satisfies a
// same-id exception here.
const ALLOW = [
  {
    id: 'source-path',
    re: /^scripts\/[\w.-]+\.mjs$/,
    reason: 'repo tooling reference, not private runtime source',
  },
];

function isAllowed(id, match, file, line) {
  return ALLOW.some(
    (a) =>
      a.id === id &&
      a.re.test(match) &&
      (!a.files || a.files.has(file)) &&
      (!a.lineRe || a.lineRe.test(line)),
  );
}

const tokensFromEnv = () => (process.env.NEUTRALITY_DENYLIST || '')
  .split(/[\r\n,]/).map((token) => token.trim()).filter(Boolean);

export function parts(text) {
  return text.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function matches(text, token) {
  const whole = token.startsWith('=');
  const entry = whole ? token.slice(1) : token;
  const target = parts(entry).join('');
  if (!target) return false;
  const words = text.split(/\s+/).map(parts);
  // Names can span words; identifier runs stay inside one whitespace word.
  const scopes = /[\s-]/.test(entry) ? [words.flat()] : words;
  for (const scope of scopes) {
    if (!whole) {
      if (scope.join('').includes(target)) return true;
      continue;
    }
    for (let i = 0; i < scope.length; i++) {
      let run = '';
      for (let j = i; j < scope.length && run.length < target.length; j++) {
        run += scope[j];
        if (run === target) return true;
      }
    }
  }
  return false;
}

export function scan(files, root = ROOT, rules = RULES) {
  const tokens = tokensFromEnv();
  const withheld = tokens.length > 0 && process.env.NEUTRALITY_SHOW_VALUES !== 'true';
  const hits = [];
  let read = 0;
  let binary = 0;
  const projection = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sensitive = (value) => tokens.some((token) => {
    const target = projection(token);
    return matches(value, token) || (target && projection(value).includes(target));
  });
  const add = (file, line, rule, match) => hits.push({
    file: withheld && sensitive(file) ? '(path withheld)' : file,
    line, rule, ...(withheld ? {} : { match }),
  });
  function visit(file) {
    if (tokens.some((token) => matches(file, token))) add(file, 0, 'private-token', file);
    const full = join(root, file);
    let bytes;
    let children;
    try {
      const link = lstatSync(full);
      const stat = link.isSymbolicLink() ? statSync(full) : link;
      if (link.isSymbolicLink() && stat.isDirectory()) return;
      if (stat.isDirectory()) {
        children = readdirSync(full);
      } else {
        bytes = readFileSync(full);
      }
    } catch {
      add(file, 0, 'unreadable', 'unreadable entry');
      return;
    }
    if (children) {
      for (const name of children) {
        if (!EXCLUDED_DIRS.has(name)) visit(file ? file + '/' + name : name);
      }
      return;
    }
    if (bytes.includes(0)) {
      binary++;
      const projections = [bytes.toString('latin1').replace(/\0/g, '')];
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        projections.push(bytes.subarray(2).toString('utf16le'));
      } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        const swapped = Buffer.from(bytes.subarray(2, bytes.length - (bytes.length % 2)));
        swapped.swap16();
        projections.push(swapped.toString('utf16le'));
      }
      for (const text of new Set(projections)) {
        text.split(/\r\n|[\r\n]/).forEach((line, i) => {
          if (tokens.some((token) => matches(line, token))) add(file, i + 1, 'private-token', line);
        });
      }
      return;
    }
    read++;
    bytes.toString('utf8').split(/\r\n|[\r\n]/).forEach((line, i) => {
      if (tokens.some((token) => matches(line, token))) add(file, i + 1, 'private-token', line);
      if (!file.startsWith('guide/') || file.startsWith('guide/scripts/') ||
          !(TEXT_EXT.has(extname(file)) || TEXT_FILES.has(file.split('/').at(-1)))) return;
      for (const rule of rules) {
        if (rule.exts && !rule.exts.has(extname(file))) continue;
        if (rule.sourcePaths) {
          for (const token of line.split(/[^\w./-]+/)) {
            // Each candidate is consumed once, including long extensionless runs.
            // Retain the greedy rule's final extension boundary, even before
            // a slash or hyphen, without retrying a growing prefix.
            let end = 0;
            for (const extension of token.matchAll(/\.mjs\b/gi)) {
              end = extension.index + extension[0].length;
            }
            const candidate = token.slice(0, end);
            if (!candidate.toLowerCase().endsWith('.mjs')) continue;
            const match = candidate.replace(/^[^\w]+/, '');
            if (match.length > 4 && !isAllowed(rule.id, match, file, line)) {
              add(file, i + 1, rule.id, match);
            }
          }
          continue;
        }
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
          if (!m[0].length) { rule.re.lastIndex++; continue; }
          if (!isAllowed(rule.id, m[0], file, line)) add(file, i + 1, rule.id, m[0]);
        }
      }
    });
  }
  for (const file of files) visit(file);
  Object.defineProperties(hits, { read: { value: read }, binary: { value: binary } });
  return hits;
}

function canonicalPath(path) {
  try { return realpathSync(path); }
  catch { return resolve(path); }
}

export function main() {
  const entries = tokensFromEnv();
  const project = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const print = (stream, value) => {
    const text = String(value);
    const hidden = process.env.NEUTRALITY_SHOW_VALUES !== 'true' &&
      entries.some((entry) => matches(text, entry) ||
        (project(entry) && project(text).includes(project(entry))));
    console[stream](hidden ? '(text withheld)' : text);
  };
  const log = (value) => print('log', value);
  const error = (value) => print('error', value);
  try {
    if (!tokensFromEnv().length) {
      if (process.env.NEUTRALITY_REQUIRE_DENYLIST === 'true') {
        error('Neutrality check FAILED: private list is required but not configured.');
        return 1;
      }
      log('Private list is not configured; only public pattern rules ran.');
    }
    const hits = scan(['']);
    log(`Neutrality check: scanned ${hits.read} files; skipped public rules for ${hits.binary} binary files (private list still applied).`);
    if (!hits.length) {
      log('Neutrality check passed: no private-context tokens.');
      return 0;
    }
    error(`Neutrality check FAILED: ${hits.length} private-context token(s) found.`);
    for (const h of hits) error(`${h.file}:${h.line} [${h.rule}]${h.match === undefined ? '' : ' ' + h.match}`);
    if (hits.some((h) => ['private-token', 'unreadable'].includes(h.rule))) {
      error('Private-token hits cannot be allowlisted; remove or genericize the text. Resolve unreadable entries.');
    }
    if (hits.some((h) => !['private-token', 'unreadable'].includes(h.rule))) {
      error('Remove or genericize the text, or add a reasoned public-rule allowlist entry in guide/scripts/check-neutrality.mjs.');
    }
    return 1;
  } catch (failure) {
    error('Neutrality check FAILED: internal error (details withheld; rerun locally with NEUTRALITY_SHOW_VALUES=true)');
    if (process.env.NEUTRALITY_SHOW_VALUES === 'true') error(failure);
    return 2;
  }
}

if (process.argv[1] && canonicalPath(process.argv[1]) === canonicalPath(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
