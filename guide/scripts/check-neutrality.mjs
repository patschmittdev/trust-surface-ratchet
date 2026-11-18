#!/usr/bin/env node
// Neutrality guard for the trust-surface-ratchet field guide.
//
// Purpose: fail the build if any tracked text file reintroduces private
// context from the internal sources this guide was distilled from. The guide
// promises to be implementation-neutral and self-contained; this script turns
// that promise into an enforced ratchet so it cannot silently regress.
//
// Zero dependencies. Runs with plain `node scripts/check-neutrality.mjs`.
// Exit code 0 when clean, 1 when any token is found.

import { fileURLToPath } from 'node:url';

import { readdirSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { join, relative, extname, sep, resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Directories that are never scanned.
// - .lake / node_modules: build output and vendored code.
// - .git: version control internals.
const EXCLUDED_DIRS = new Set(['.git', '.lake', 'node_modules']);

// Public pattern rules retain their original guide text surfaces.
// Private tokens scan every non-binary repository file.
const TEXT_EXT = new Set(['.md', '.svg', '.lean', '.json', '.yml', '.yaml', '.toml', '.txt']);
const TEXT_FILES = new Set(['lean-toolchain', 'LICENSE', '.gitignore']);

// Denylist. Each rule has a stable id and a regex. An optional `exts` set
// scopes the rule to specific file extensions to avoid prose false positives.
//
// Notes on precision:
// - Product tokens match whole identifiers, leaving delegation vocabulary legal.
// - catalog-id is case sensitive (capital D) and scoped to .svg, so lowercase
//   hex colors such as #d4d4d4 are never flagged.
const RULES = [
  { id: 'brand', re: /patschmitt\w*/gi },
  { id: 'tool-name', re: /\bcli_[a-z][a-z0-9_]*\b/gi },
  { id: 'source-path', re: /\b[\w./-]+\.mjs\b/gi },
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

const tokensFromEnv = () => (process.env.NEUTRALITY_DENYLIST || '').split(/[\n,]/).map(t => t.trim()).filter(Boolean);
const normalize = s => s.toLowerCase().replace(/[_-]/g, '');
function matches(text, token) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) return text.toLowerCase().includes(token.toLowerCase());
  for (const [id] of text.matchAll(/[A-Za-z_][A-Za-z0-9_-]*/g)) {
    if (normalize(id) === normalize(token)) return true;
    const parts = id.replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').replace(/([a-z0-9])([A-Z])/g, '$1_$2').split(/[_-]+/).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      let run = '';
      for (let j = i; j < parts.length; j++) {
        run += normalize(parts[j]);
        if (run === normalize(token)) return true;
      }
    }
  }
  return false;
}
function safe(value, tokens) {
  return process.env.NEUTRALITY_SHOW_VALUES !== 'true' && tokens.some(t => matches(value,t) || value.toLowerCase().includes(t.toLowerCase())) ? '(value withheld)' : value;
}
function walk(dir, acc, seen = new Set()) {
  const real = canonicalPath(dir);
  if (seen.has(real)) return acc;
  seen.add(real);
  for (const name of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(name)) continue;
    const full = join(dir,name);
    acc.push(relative(ROOT,full).split(sep).join('/'));
    if (statSync(full).isDirectory()) walk(full,acc,seen);
  }
  return acc;
}
export function scan(files, root = ROOT, rules = RULES) {
  const tokens = tokensFromEnv(), hits = [];
  const add = (file,line,rule,match) => hits.push({file:safe(file,tokens),line,rule:safe(rule,tokens),match:safe(match,tokens)});
  for (const file of files) {
    if (tokens.some(t=>matches(file,t))) add(file,0,'private-token',file);
    if (statSync(join(root,file)).isDirectory()) continue;
    const bytes = readFileSync(join(root,file));
    if (bytes.includes(0)) continue;
    bytes.toString('utf8').split(/\r?\n/).forEach((line,i)=>{
      if (tokens.some(t=>matches(line,t))) add(file,i+1,'private-token',line);
      if (!file.startsWith('guide/') || file.startsWith('guide/scripts/') ||
          !(TEXT_EXT.has(extname(file)) || TEXT_FILES.has(file.split('/').at(-1)))) return;
      for (const rule of rules) {
        if (rule.exts && !rule.exts.has(extname(file))) continue;
        rule.re.lastIndex=0;
        let m;
        while ((m=rule.re.exec(line)) !== null) {
          if (!m[0].length) { rule.re.lastIndex++; continue; }
          if (!isAllowed(rule.id,m[0],file,line)) add(file,i+1,rule.id,m[0]);
        }
      }
    });
  }
  return hits;
}

function canonicalPath(path) {
  try { return realpathSync(path); }
  catch { return resolve(path); }
}

if (process.argv[1] && canonicalPath(process.argv[1]) === canonicalPath(fileURLToPath(import.meta.url))) {
  if (!(process.env.NEUTRALITY_DENYLIST || '').split(/[\n,]/).some(t => t.trim())) {
    if (process.env.NEUTRALITY_REQUIRE_DENYLIST === 'true') {
      console.error('Neutrality check FAILED: private list is required but not configured.');
      process.exit(1);
    }
    console.log('Private list is not configured; only public pattern rules ran.');
  }
  const files = walk(ROOT, []);
  const hits = scan(files);

  if (hits.length > 0) {
    console.error(`Neutrality check FAILED: ${hits.length} private-context token(s) found.\n`);
    for (const h of hits) {
      console.error(`  ${h.file}:${h.line}  [${h.rule}]  ${h.match}`);
    }
    console.error(
      '\nRemove or genericize each token, or add an allowlist entry with a reason\n' +
        'in scripts/check-neutrality.mjs if the match is a legitimate false positive.',
    );
    process.exit(1);
  }

  console.log(`Neutrality check passed: scanned ${files.filter(file => !statSync(join(ROOT, file)).isDirectory()).length} files, no private-context tokens.`);
}
