#!/usr/bin/env node
// Trust Surface Ratchet coverage gate.
// For each `export const X = Object.freeze(...)` under scanRoots, require X in
// exactly one of LOCKDOWN_MANIFEST or NON_LOAD_BEARING. LOCKDOWN_MANIFEST
// entries must point at a repo-relative test file that exists, mentions the
// symbol, and uses assert.deepEqual/deepStrictEqual. That heuristic is useful
// but intentionally shallow: it cannot prove semantic exhaustiveness. Set
// strictPins to true to also require an import of the registered symbol.
//
// To vendor into another repo: adjust SCAN_ROOTS, LOCKDOWN_MANIFEST, and
// NON_LOAD_BEARING, then wire `node gate/check-lockdown-coverage.mjs` (or your
// chosen path) into CI and local tests.

import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["examples/permission-modes/lib"];
const DEFAULT_FREEZE_CALLS = Object.freeze(["Object.freeze", "makeFrozenSet"]);

export const LOCKDOWN_MANIFEST = Object.freeze({
  PERMISSION_MODE_VALUES: "examples/permission-modes/tests/permission-modes.test.mjs",
});

export const NON_LOAD_BEARING = Object.freeze(new Set());

const DEFAULT_CONFIG = Object.freeze({
  scanRoots: Object.freeze([...SCAN_ROOTS]),
  lockdownManifest: LOCKDOWN_MANIFEST,
  nonLoadBearing: NON_LOAD_BEARING,
  discovery: Object.freeze({ freezeCalls: DEFAULT_FREEZE_CALLS }),
  strictPins: false,
});

const EXPORT_NAME_RE = /^[A-Z][A-Z0-9_]+$/;
const FREEZE_CALL_RE = /^(?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)?$/;

export class LockdownConfigError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "LockdownConfigError";
    if ("cause" in options) this.cause = options.cause;
  }
}

/** @typedef {{ rel: string, abs: string }} ResolvedPath */
/** @typedef {{ name: string, file: string }} FrozenExport */
/** @typedef {"configuration" | "uncategorized" | "stale-manifest" | "duplicate-categorization" | "missing-lockdown" | "ambiguous-export"} ViolationKind */
/** @typedef {{ kind: ViolationKind, message: string }} Violation */

const normalize = (filePath) => filePath.split(path.sep).join("/");
const fsDetail = (error) => (error instanceof Error ? error.message : String(error));
const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

function isContained(repoRoot, absPath) {
  const relative = path.relative(repoRoot, absPath);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

function configurationFailure(message, scanRoots = []) {
  return { violations: [{ kind: "configuration", message }], exports: [], scanRoots };
}

function requireRepoRoot(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new LockdownConfigError(`repoRoot must be a non-empty string; got ${typeof value}.`);
  }
  const resolved = path.resolve(value);
  let stat;
  try {
    stat = lstatSync(resolved);
  } catch (error) {
    throw new LockdownConfigError(`repoRoot cannot be read: ${fsDetail(error)}`, { cause: error });
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new LockdownConfigError("repoRoot must be a real directory, not a file or symbolic link.");
  }
  return resolved;
}

function requireExportName(value, label) {
  if (typeof value !== "string" || !EXPORT_NAME_RE.test(value)) {
    throw new LockdownConfigError(
      `${label} must be an uppercase export symbol like PERMISSION_MODE_VALUES; got ${String(value)}`,
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requireDiscovery(config) {
  const discovery = config.discovery ?? { freezeCalls: DEFAULT_FREEZE_CALLS };
  if (!isPlainObject(discovery)) {
    throw new LockdownConfigError("discovery must be an object with a non-empty freezeCalls array.");
  }
  if (!Array.isArray(discovery.freezeCalls) || discovery.freezeCalls.length === 0) {
    throw new LockdownConfigError("discovery.freezeCalls must be a non-empty array of helper names.");
  }

  const seen = new Set();
  for (const freezeCall of discovery.freezeCalls) {
    if (typeof freezeCall !== "string") {
      throw new LockdownConfigError("discovery.freezeCalls entries must be strings.");
    }
    if (!FREEZE_CALL_RE.test(freezeCall)) {
      throw new LockdownConfigError(
        `discovery.freezeCalls entry ${JSON.stringify(freezeCall)} must be a simple helper name.`,
      );
    }
    if (seen.has(freezeCall)) {
      throw new LockdownConfigError(
        `discovery.freezeCalls contains duplicate helper name ${JSON.stringify(freezeCall)}.`,
      );
    }
    seen.add(freezeCall);
  }

  return new RegExp(
    `^export const ([A-Z][A-Z0-9_]+)\\s*=\\s*(?:${discovery.freezeCalls.map(escapeRegExp).join("|")})(?:\\b|(?=\\s*\\())`,
    "gm",
  );
}

function requireRelativePath(repoRoot, value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new LockdownConfigError(`${label} must be a non-empty relative path.`);
  }
  if (path.isAbsolute(value)) {
    throw new LockdownConfigError(
      `${label} must stay relative to the repo root; absolute path rejected: ${value}`,
    );
  }
  const abs = path.resolve(repoRoot, value);
  if (!isContained(repoRoot, abs)) {
    throw new LockdownConfigError(`${label} escapes the repo root and is rejected: ${value}`);
  }
  return { abs, rel: normalize(path.relative(repoRoot, abs) || ".") };
}

function rejectSymlinkComponents(repoRoot, resolvedPath, label) {
  const relative = path.relative(repoRoot, resolvedPath.abs);
  let current = repoRoot;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") return;
      throw new LockdownConfigError(`${label} cannot be inspected: ${fsDetail(error)}`, {
        cause: error,
      });
    }
    if (stat.isSymbolicLink()) {
      const link = normalize(path.relative(repoRoot, current));
      throw new LockdownConfigError(
        `${label} contains symbolic link component ${link}; configured paths must stay in the real repository tree.`,
      );
    }
  }
}

function requireDisjointRoots(scanRoots) {
  for (let i = 0; i < scanRoots.length; i += 1) {
    for (let j = i + 1; j < scanRoots.length; j += 1) {
      if (isContained(scanRoots[i].abs, scanRoots[j].abs) || isContained(scanRoots[j].abs, scanRoots[i].abs)) {
        throw new LockdownConfigError(
          `scanRoots entries overlap after resolution (${scanRoots[i].rel} and ${scanRoots[j].rel}). ` +
            `Configure disjoint roots so each frozen export is discovered once.`,
        );
      }
    }
  }
}

function resolveContext(options = {}) {
  const repoRoot = requireRepoRoot(options.repoRoot ?? REPO_ROOT);
  const config = options.config ?? DEFAULT_CONFIG;
  if (!isPlainObject(config)) {
    throw new LockdownConfigError(
      "config must be an object with scanRoots, lockdownManifest, and nonLoadBearing.",
    );
  }

  const { scanRoots, lockdownManifest, nonLoadBearing, strictPins = false } = config;
  if (typeof strictPins !== "boolean") {
    throw new LockdownConfigError("strictPins must be a boolean when provided.");
  }
  const frozenExportRe = requireDiscovery(config);
  if (!Array.isArray(scanRoots) || scanRoots.length === 0) {
    throw new LockdownConfigError("scanRoots must be a non-empty array of relative paths.");
  }

  const resolvedRoots = scanRoots.map((root, index) =>
    requireRelativePath(repoRoot, root, `scanRoots[${index}]`),
  );
  resolvedRoots.forEach((root, index) =>
    rejectSymlinkComponents(repoRoot, root, `scanRoots[${index}]`),
  );
  requireDisjointRoots(resolvedRoots);

  if (!isPlainObject(lockdownManifest)) {
    throw new LockdownConfigError(
      "lockdownManifest must be a plain object that maps export names to test file paths.",
    );
  }
  const resolvedManifest = Object.create(null);
  for (const [name, testPath] of Object.entries(lockdownManifest)) {
    requireExportName(name, `lockdownManifest key ${JSON.stringify(name)}`);
    const resolved = requireRelativePath(repoRoot, testPath, `lockdownManifest.${name}`);
    rejectSymlinkComponents(repoRoot, resolved, `lockdownManifest.${name}`);
    resolvedManifest[name] = resolved;
  }

  if (!(nonLoadBearing instanceof Set)) {
    throw new LockdownConfigError("nonLoadBearing must be a Set of export names.");
  }
  const resolvedExempt = new Set();
  for (const name of nonLoadBearing) {
    requireExportName(name, `nonLoadBearing entry ${JSON.stringify(name)}`);
    resolvedExempt.add(name);
  }

  return {
    repoRoot,
    scanRoots: resolvedRoots,
    lockdownManifest: resolvedManifest,
    nonLoadBearing: resolvedExempt,
    frozenExportRe,
    strictPins,
  };
}

function readScanRootStat(scanRoot) {
  try {
    return lstatSync(scanRoot.abs);
  } catch (error) {
    throw new LockdownConfigError(
      error && typeof error === "object" && error.code === "ENOENT"
        ? `Configured scan root ${scanRoot.rel} does not exist.`
        : `Configured scan root ${scanRoot.rel} cannot be read: ${fsDetail(error)}`,
      { cause: error },
    );
  }
}

function walkMjsFiles(repoRoot, absDir, out = []) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (error) {
    throw new LockdownConfigError(
      `Cannot read directory ${normalize(path.relative(repoRoot, absDir) || ".")}: ${fsDetail(error)}`,
      { cause: error },
    );
  }

  for (const entry of entries) {
    const fullPath = path.join(absDir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkMjsFiles(repoRoot, fullPath, out);
    else if (entry.isFile() && entry.name.endsWith(".mjs")) out.push(fullPath);
  }
  return out;
}

function findFrozenExportsFromContext(context) {
  /** @type {FrozenExport[]} */
  const found = [];

  for (const scanRoot of context.scanRoots) {
    const stat = readScanRootStat(scanRoot);
    if (stat.isSymbolicLink()) {
      throw new LockdownConfigError(
        `Configured scan root ${scanRoot.rel} is a symbolic link. This gate skips symlinked directories instead of following them.`,
      );
    }
    if (!stat.isDirectory()) {
      throw new LockdownConfigError(`Configured scan root ${scanRoot.rel} is not a directory.`);
    }

    const files = walkMjsFiles(context.repoRoot, scanRoot.abs);
    if (files.length === 0) throw new LockdownConfigError(`source root ${scanRoot.rel} contains no .mjs files; the gate scans only .mjs`);
    for (const file of files) {
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch (error) {
        throw new LockdownConfigError(
          `Cannot read source file ${normalize(path.relative(context.repoRoot, file))}: ${fsDetail(error)}`,
          { cause: error },
        );
      }
      for (const [, name] of text.matchAll(context.frozenExportRe)) {
        found.push({ name, file: normalize(path.relative(context.repoRoot, file)) });
      }
    }
  }

  found.sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file));
  return found;
}

export function findFrozenExports(options = {}) {
  return findFrozenExportsFromContext(resolveContext(options));
}

function lockdownTestProblem(testFile, symbol, options = {}) {
  let stat;
  try {
    stat = lstatSync(testFile.abs);
  } catch (error) {
    return error && typeof error === "object" && error.code === "ENOENT"
      ? `lockdown test file ${testFile.rel} does not exist.`
      : `cannot read lockdown test file ${testFile.rel}: ${fsDetail(error)}`;
  }

  if (stat.isDirectory()) {
    return `lockdown test path ${testFile.rel} points to a directory; LOCKDOWN_MANIFEST must point to a file`;
  }
  if (!stat.isFile()) {
    return `lockdown test path ${testFile.rel} is not a regular file`;
  }

  let text;
  try {
    text = readFileSync(testFile.abs, "utf8");
  } catch (error) {
    return `cannot read lockdown test file ${testFile.rel}: ${fsDetail(error)}`;
  }

  if (!new RegExp(`\\b${symbol}\\b`).test(text)) {
    return (
      `lockdown test ${testFile.rel} does not reference symbol ${symbol}; ` +
      "either the symbol was renamed or the manifest entry is stale"
    );
  }
  if (
    options.strictPins &&
    !new RegExp(`import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from\\s*["'][^"']+["']`).test(text)
  ) {
    return (
      `strict mode requires a raw-text import statement naming symbol ${symbol} from a source module; ` +
      "a commented-out import also matches; the assertion is not tied to the symbol. This is a heuristic; run the real tests"
    );
  }
  if (!/assert\.deep(?:Strict)?Equal\s*\(/.test(text)) {
    return (
      `lockdown test ${testFile.rel} contains no assert.deepEqual/assert.deepStrictEqual call; ` +
      "this superficial heuristic only checks file presence, symbol reference, and deep-equality syntax. " +
      "It cannot prove semantic exhaustiveness, expected-list safety, classification correctness, complete registration, or runtime behavior"
    );
  }
  return null;
}

export function checkLockdownCoverage(options = {}) {
  let context;
  try {
    context = resolveContext(options);
  } catch (error) {
    if (error instanceof LockdownConfigError) return configurationFailure(error.message);
    throw error;
  }

  let exports;
  try {
    exports = findFrozenExportsFromContext(context);
  } catch (error) {
    if (error instanceof LockdownConfigError) {
      return configurationFailure(error.message, context.scanRoots.map(({ rel }) => rel));
    }
    throw error;
  }

  /** @type {Violation[]} */
  const violations = [];
  const exportsByName = new Map();
  for (const entry of exports) {
    const files = exportsByName.get(entry.name);
    if (files) files.push(entry.file);
    else exportsByName.set(entry.name, [entry.file]);
  }

  for (const [name, files] of exportsByName) {
    if (files.length > 1) {
      violations.push({
        kind: "ambiguous-export",
        message:
          `Frozen export ${name} is discovered in multiple files (${files.join(", ")}). ` +
          "LOCKDOWN_MANIFEST is name-keyed, so the export site is ambiguous until the duplicates are collapsed.",
      });
      continue;
    }

    const inManifest = Object.prototype.hasOwnProperty.call(context.lockdownManifest, name);
    const inExempt = context.nonLoadBearing.has(name);
    if (inManifest && inExempt) {
      violations.push({
        kind: "duplicate-categorization",
        message:
          `Frozen export ${name} (${files[0]}) is in BOTH LOCKDOWN_MANIFEST and NON_LOAD_BEARING. ` +
          "Pick one: load-bearing surfaces stay in LOCKDOWN_MANIFEST; mechanical constants stay in NON_LOAD_BEARING.",
      });
      continue;
    }
    if (!inManifest && !inExempt) {
      violations.push({
        kind: "uncategorized",
        message:
          `New frozen export ${name} in ${files[0]} is not categorized. In the same PR either add ` +
          `${name}: \"tests/<file>.test.mjs\" to LOCKDOWN_MANIFEST beside a lockdown that names the symbol ` +
          "and uses assert.deepEqual/assert.deepStrictEqual, or add it to NON_LOAD_BEARING with an inline reason if it is mechanical/internal rather than a trust-boundary category. " +
          "See https://github.com/patschmittdev/trust-surface-ratchet/blob/main/practice.md for the practice this gate supports.",
      });
      continue;
    }
    if (inManifest) {
      const problem = lockdownTestProblem(context.lockdownManifest[name], name, {
        strictPins: context.strictPins,
      });
      if (problem) {
        violations.push({
          kind: "missing-lockdown",
          message: `LOCKDOWN_MANIFEST entry for ${name} is broken: ${problem}.`,
        });
      }
    }
  }

  const knownNames = new Set(exportsByName.keys());
  const scanRoots = context.scanRoots.map(({ rel }) => rel);
  for (const name of Object.keys(context.lockdownManifest)) {
    if (!knownNames.has(name)) {
      violations.push({
        kind: "stale-manifest",
        message:
          `LOCKDOWN_MANIFEST lists ${name} but no matching frozen export exists under the configured source roots (${scanRoots.join(", ")}). ` +
          "Remove the entry from this script, or restore the export, in the same PR.",
      });
    }
  }
  for (const name of context.nonLoadBearing) {
    if (!knownNames.has(name)) {
      violations.push({
        kind: "stale-manifest",
        message:
          `NON_LOAD_BEARING lists ${name} but no matching frozen export exists under the configured source roots. ` +
          "Remove the entry from this script.",
      });
    }
  }

  return { violations, exports, scanRoots };
}

export function runCli(options = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const { violations, exports, scanRoots } = checkLockdownCoverage(options);
  stdout.write(
    `trust-surface-ratchet coverage gate: scanned ${exports.length === 1 ? "1 frozen export" : `${exports.length} frozen exports`} under ` +
      `${scanRoots.join(", ") || "<invalid-config>"}, ${violations.length} violation(s).\n`,
  );

  for (const { kind, message } of violations) {
    stderr.write(`lockdown coverage [${kind}]: ${message}\n`);
  }
  if (violations.length === 0) {
    stdout.write("All discovered frozen exports are categorized.\n");
    return 0;
  }

  stderr.write(
    "See https://github.com/patschmittdev/trust-surface-ratchet/blob/main/practice.md for the practice this gate supports.\n",
  );
  return 1;
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) {
  process.exitCode = runCli();
}
