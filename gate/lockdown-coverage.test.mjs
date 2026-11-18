import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkLockdownCoverage,
  LockdownConfigError,
  LOCKDOWN_MANIFEST,
  NON_LOAD_BEARING,
  findFrozenExports,
  runCli,
} from "./check-lockdown-coverage.mjs";

const GATE_DIR = path.dirname(fileURLToPath(import.meta.url));

function createTempRepo(t) {
  const repoRoot = mkdtempSync(path.join(GATE_DIR, ".lockdown-coverage-test-"));
  t.after(() => rmSync(repoRoot, { recursive: true, force: true }));
  return repoRoot;
}

function writeRepoFile(repoRoot, relPath, contents) {
  const absPath = path.join(repoRoot, ...relPath.split("/"));
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, contents);
}

function writeExport(repoRoot, relPath = "src/alpha.mjs", name = "ALPHA_VALUES", frozen = '["a"]') {
  writeRepoFile(repoRoot, relPath, `export const ${name} = Object.freeze(${frozen});\n`);
}

function writeLockdown(repoRoot, relPath, lines) {
  writeRepoFile(repoRoot, relPath, `${lines.join("\n")}\n`);
}

function makeConfig({
  scanRoots = ["src"],
  lockdownManifest = {},
  nonLoadBearing = new Set(),
  discovery,
  strictPins,
} = {}) {
  return {
    scanRoots,
    lockdownManifest,
    nonLoadBearing,
    ...(discovery === undefined ? {} : { discovery }),
    ...(strictPins === undefined ? {} : { strictPins }),
  };
}

function summarizeViolations(violations) {
  return violations.map((v) => `${v.kind}: ${v.message}`).join("\n");
}

function expectOneViolation(result, kind, pattern) {
  assert.equal(result.violations.length, 1, summarizeViolations(result.violations));
  assert.equal(result.violations[0].kind, kind);
  if (pattern) assert.match(result.violations[0].message, pattern);
}

function captureStream() {
  const output = [];
  return {
    output,
    stream: {
      write(chunk) {
        output.push(String(chunk));
        return true;
      },
    },
  };
}

function tryCreateDirSymlink(target, linkPath) {
  try {
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (error && typeof error === "object" && ["EPERM", "EACCES", "UNKNOWN"].includes(error.code)) {
      return false;
    }
    throw error;
  }
}

test("every discovered supported export is categorized (LOCKDOWN_MANIFEST xor NON_LOAD_BEARING)", () => {
  const { violations } = checkLockdownCoverage();
  if (violations.length) {
    assert.fail(
      `Lockdown coverage gate found ${violations.length} violation(s):\n${summarizeViolations(violations)}\n\n` +
        "Trust-surface editing contract: every newly discovered supported Object.freeze export under the configured source roots MUST be categorized in gate/check-lockdown-coverage.mjs in the same PR it is introduced. See https://github.com/patschmittdev/trust-surface-ratchet/blob/main/practice.md for the practice.",
    );
  }
});

test("LOCKDOWN_MANIFEST and NON_LOAD_BEARING are disjoint", () => {
  const overlap = Object.keys(LOCKDOWN_MANIFEST).filter((name) => NON_LOAD_BEARING.has(name));
  assert.deepEqual(overlap, []);
});

test("findFrozenExports discovers at least every name registered in the manifest", () => {
  const found = new Set(findFrozenExports().map(({ name }) => name));
  const missing = Object.keys(LOCKDOWN_MANIFEST).filter((name) => !found.has(name));
  assert.deepEqual(missing, []);
});

test("findFrozenExports accepts injected repoRoot/config and normalizes reported paths", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot, "src/nested/alpha.mjs");
  assert.deepEqual(findFrozenExports({ repoRoot, config: makeConfig() }), [
    { name: "ALPHA_VALUES", file: "src/nested/alpha.mjs" },
  ]);
});

test("findFrozenExports keeps Object.freeze and makeFrozenSet in the default discovery set", (t) => {
  const repoRoot = createTempRepo(t);
  writeRepoFile(repoRoot, "src/alpha.mjs", 'export const ALPHA_VALUES = Object.freeze(["a"]);\n');
  writeRepoFile(repoRoot, "src/beta.mjs", 'export const BETA_VALUES = makeFrozenSet(["b"]);\n');

  assert.deepEqual(findFrozenExports({ repoRoot, config: makeConfig() }), [
    { name: "ALPHA_VALUES", file: "src/alpha.mjs" },
    { name: "BETA_VALUES", file: "src/beta.mjs" },
  ]);
});

test("findFrozenExports recognizes a configured freeze helper", (t) => {
  const repoRoot = createTempRepo(t);
  writeRepoFile(repoRoot, "src/gamma.mjs", 'export const GAMMA_VALUES = deepFreeze(["g"]);\n');

  assert.deepEqual(
    findFrozenExports({
      repoRoot,
      config: makeConfig({
        discovery: { freezeCalls: ["Object.freeze", "makeFrozenSet", "deepFreeze"] },
      }),
    }),
    [{ name: "GAMMA_VALUES", file: "src/gamma.mjs" }],
  );
});

test("findFrozenExports recognizes a configured freeze helper ending in $", (t) => {
  const repoRoot = createTempRepo(t);
  writeRepoFile(repoRoot, "src/gamma.mjs", 'export const GAMMA_VALUES = deepFreeze$(["g"]);\n');

  assert.deepEqual(
    findFrozenExports({
      repoRoot,
      config: makeConfig({
        discovery: { freezeCalls: ["Object.freeze", "makeFrozenSet", "deepFreeze$"] },
      }),
    }),
    [{ name: "GAMMA_VALUES", file: "src/gamma.mjs" }],
  );
});

test("findFrozenExports keeps unconfigured freeze helpers invisible", (t) => {
  const repoRoot = createTempRepo(t);
  writeRepoFile(repoRoot, "src/gamma.mjs", 'export const GAMMA_VALUES = deepFreeze(["g"]);\n');

  assert.deepEqual(findFrozenExports({ repoRoot, config: makeConfig() }), []);
});

for (const { name, freezeCalls, pattern } of [
  { name: "empty arrays", freezeCalls: [], pattern: /non-empty array/i },
  { name: "non-string entries", freezeCalls: ["Object.freeze", 1], pattern: /string/i },
  { name: "duplicate entries", freezeCalls: ["Object.freeze", "Object.freeze"], pattern: /duplicate/i },
  { name: "unsafe helper syntax", freezeCalls: ["Object.freeze", "deep-Freeze"], pattern: /simple/i },
]) {
  test(`findFrozenExports rejects discovery freezeCalls with ${name}`, (t) => {
    const repoRoot = createTempRepo(t);
    writeExport(repoRoot);

    assert.throws(
      () =>
        findFrozenExports({
          repoRoot,
          config: makeConfig({ discovery: { freezeCalls } }),
        }),
      (error) => error instanceof LockdownConfigError && pattern.test(error.message),
    );
  });
}

test("findFrozenExports accepts an in-repo path whose name starts with two dots", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot, "..cache/alpha.mjs");

  assert.deepEqual(
    findFrozenExports({ repoRoot, config: makeConfig({ scanRoots: ["..cache"] }) }),
    [{ name: "ALPHA_VALUES", file: "..cache/alpha.mjs" }],
  );
});

test("findFrozenExports throws a clear config error for absolute scan roots", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot);
  assert.throws(
    () => findFrozenExports({ repoRoot, config: makeConfig({ scanRoots: [path.join(repoRoot, "src")] }) }),
    (error) => error instanceof LockdownConfigError && /absolute path rejected/i.test(error.message),
  );
});

test("findFrozenExports skips nested symlinked directories", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot, "src/alpha.mjs", "ALPHA_VALUES");
  writeExport(repoRoot, "linked/beta.mjs", "BETA_VALUES");
  if (!tryCreateDirSymlink(path.join(repoRoot, "linked"), path.join(repoRoot, "src", "linked"))) {
    t.skip("symlinks unavailable on this host");
    return;
  }
  assert.deepEqual(findFrozenExports({ repoRoot, config: makeConfig() }), [
    { name: "ALPHA_VALUES", file: "src/alpha.mjs" },
  ]);
});

test("checkLockdownCoverage rejects scan roots that are symlinks", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot, "real/alpha.mjs");
  if (!tryCreateDirSymlink(path.join(repoRoot, "real"), path.join(repoRoot, "scan"))) {
    t.skip("symlinks unavailable on this host");
    return;
  }
  expectOneViolation(
    checkLockdownCoverage({ repoRoot, config: makeConfig({ scanRoots: ["scan"] }) }),
    "configuration",
    /symbolic link/i,
  );
});

test("checkLockdownCoverage rejects intermediate symlinks in scan roots", (t) => {
  const repoRoot = createTempRepo(t);
  const outsideRoot = createTempRepo(t);
  writeExport(outsideRoot);
  if (!tryCreateDirSymlink(outsideRoot, path.join(repoRoot, "linked"))) {
    t.skip("symlinks unavailable on this host");
    return;
  }
  expectOneViolation(
    checkLockdownCoverage({ repoRoot, config: makeConfig({ scanRoots: ["linked/src"] }) }),
    "configuration",
    /symbolic link component linked/i,
  );
});

test("checkLockdownCoverage rejects intermediate symlinks in lockdown paths", (t) => {
  const repoRoot = createTempRepo(t);
  const outsideRoot = createTempRepo(t);
  writeExport(repoRoot);
  writeLockdown(outsideRoot, "alpha.test.mjs", [
    'import assert from "node:assert/strict";',
    "assert.deepEqual(ALPHA_VALUES, []);",
  ]);
  if (!tryCreateDirSymlink(outsideRoot, path.join(repoRoot, "linked"))) {
    t.skip("symlinks unavailable on this host");
    return;
  }
  expectOneViolation(
    checkLockdownCoverage({
      repoRoot,
      config: makeConfig({
        lockdownManifest: { ALPHA_VALUES: "linked/alpha.test.mjs" },
      }),
    }),
    "configuration",
    /symbolic link component linked/i,
  );
});

for (const { name, setup, config, kind, pattern } of [
  {
    name: "reports configuration violations for overlapping scan roots",
    setup: (repoRoot) => writeExport(repoRoot, "src/nested/alpha.mjs"),
    config: () => makeConfig({ scanRoots: ["src", "src/nested"] }),
    kind: "configuration",
    pattern: /overlap/i,
  },
  {
    name: "reports configuration violations for missing scan roots",
    setup: () => {},
    config: () => makeConfig(),
    kind: "configuration",
    pattern: /does not exist/i,
  },
  {
    name: "reports configuration violations for non-directory scan roots",
    setup: (repoRoot) => writeExport(repoRoot, "src.mjs"),
    config: () => makeConfig({ scanRoots: ["src.mjs"] }),
    kind: "configuration",
    pattern: /not a directory/i,
  },
  {
    name: "reports configuration violations for escaping lockdown test paths",
    setup: (repoRoot) => writeExport(repoRoot),
    config: () => makeConfig({ lockdownManifest: { ALPHA_VALUES: "../outside.test.mjs" } }),
    kind: "configuration",
    pattern: /escapes the repo root/i,
  },
  {
    name: "reports configuration violations for absolute lockdown test paths",
    setup: (repoRoot) => writeExport(repoRoot),
    config: (repoRoot) =>
      makeConfig({ lockdownManifest: { ALPHA_VALUES: path.join(repoRoot, "tests", "alpha.test.mjs") } }),
    kind: "configuration",
    pattern: /absolute path rejected/i,
  },
  {
    name: "reports ambiguous exports when a symbol is discovered in multiple files",
    setup: (repoRoot) => {
      writeExport(repoRoot, "src/alpha.mjs", "SHARED_VALUES");
      writeExport(repoRoot, "src/beta.mjs", "SHARED_VALUES", '["b"]');
    },
    config: () => makeConfig(),
    kind: "ambiguous-export",
    pattern: /src\/alpha\.mjs, src\/beta\.mjs/i,
  },
  {
    name: "reports duplicate categorization when a symbol is in both buckets",
    setup: (repoRoot) => writeExport(repoRoot),
    config: () =>
      makeConfig({
        lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" },
        nonLoadBearing: new Set(["ALPHA_VALUES"]),
      }),
    kind: "duplicate-categorization",
    pattern: /both lockdown_manifest and non_load_bearing/i,
  },
  {
    name: "reports stale manifest entries for removed exports",
    setup: (repoRoot) => {
      writeRepoFile(repoRoot, "src/empty.mjs", "");
      writeRepoFile(repoRoot, "tests/alpha.test.mjs", "");
    },
    config: () => makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" } }),
    kind: "stale-manifest",
    pattern: /no matching frozen export exists/i,
  },
]) {
  test(`checkLockdownCoverage ${name}`, (t) => {
    const repoRoot = createTempRepo(t);
    setup(repoRoot);
    expectOneViolation(checkLockdownCoverage({ repoRoot, config: config(repoRoot) }), kind, pattern);
  });
}

for (const { name, setup, pattern } of [
  {
    name: "reports missing-lockdown when a manifest path points to a directory",
    setup: (repoRoot) => {
      writeExport(repoRoot);
      mkdirSync(path.join(repoRoot, "tests"), { recursive: true });
      return makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests" } });
    },
    pattern: /points to a directory/i,
  },
  {
    name: "reports missing-lockdown when the lockdown artifact is absent",
    setup: (repoRoot) => {
      writeExport(repoRoot);
      return makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" } });
    },
    pattern: /does not exist/i,
  },
  {
    name: "reports missing-lockdown when the lockdown artifact omits the symbol reference",
    setup: (repoRoot) => {
      writeExport(repoRoot);
      writeLockdown(repoRoot, "tests/alpha.test.mjs", [
        'import assert from "node:assert/strict";',
        "",
        'assert.deepEqual(["a"], ["a"]);',
      ]);
      return makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" } });
    },
    pattern: /does not reference symbol ALPHA_VALUES/i,
  },
  {
    name: "reports missing-lockdown when the heuristic deep-equality pin is absent",
    setup: (repoRoot) => {
      writeExport(repoRoot);
      writeLockdown(repoRoot, "tests/alpha.test.mjs", [
        'import assert from "node:assert/strict";',
        'import { ALPHA_VALUES } from "../src/alpha.mjs";',
        "",
        "assert.equal(ALPHA_VALUES.length, 1);",
      ]);
      return makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" } });
    },
    pattern: /superficial heuristic|cannot prove semantic exhaustiveness/i,
  },
]) {
  test(`checkLockdownCoverage ${name}`, (t) => {
    const repoRoot = createTempRepo(t);
    expectOneViolation(checkLockdownCoverage({ repoRoot, config: setup(repoRoot) }), "missing-lockdown", pattern);
  });
}

test("runCli returns non-zero and splits summary/stdout from diagnostics/stderr", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot);
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = runCli({ repoRoot, config: makeConfig(), stdout: stdout.stream, stderr: stderr.stream });
  assert.equal(exitCode, 1);
  assert.match(stdout.output.join(""), /scanned 1 frozen export under src, 1 violation/i);
  assert.doesNotMatch(stdout.output.join(""), /lockdown coverage \[/i);
  assert.match(stderr.output.join(""), /lockdown coverage \[uncategorized\]/i);
});

test("runCli returns zero on success and keeps output ASCII", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot);
  writeLockdown(repoRoot, "tests/alpha.test.mjs", [
    'import assert from "node:assert/strict";',
    'import { ALPHA_VALUES } from "../src/alpha.mjs";',
    "",
    'assert.deepEqual([...ALPHA_VALUES], ["a"]);',
  ]);
  const stdout = captureStream();
  const stderr = captureStream();
  const exitCode = runCli({
    repoRoot,
    config: makeConfig({ lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" } }),
    stdout: stdout.stream,
    stderr: stderr.stream,
  });
  const stdoutText = stdout.output.join("");
  assert.equal(exitCode, 0);
  assert.match(stdoutText, /All discovered frozen exports are categorized\./);
  assert.doesNotMatch(stdoutText, /[^\x00-\x7F]/);
  assert.equal(stderr.output.join(""), "");
});

test("checkLockdownCoverage accepts imported deep-equality pins in strict mode", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot);
  writeLockdown(repoRoot, "tests/alpha.test.mjs", [
    'import assert from "node:assert/strict";',
    'import { ALPHA_VALUES } from "../src/alpha.mjs";',
    "",
    'assert.deepEqual([...ALPHA_VALUES], ["a"]);',
  ]);

  assert.deepEqual(
    checkLockdownCoverage({
      repoRoot,
      config: makeConfig({
        strictPins: true,
        lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" },
      }),
    }).violations,
    [],
  );
});

test("checkLockdownCoverage rejects comment-only symbol references in strict mode", (t) => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot);
  writeLockdown(repoRoot, "tests/alpha.test.mjs", [
    'import assert from "node:assert/strict";',
    "// ALPHA_VALUES must stay pinned.",
    "",
    'assert.deepEqual(["unrelated"], ["unrelated"]);',
  ]);

  expectOneViolation(
    checkLockdownCoverage({
      repoRoot,
      config: makeConfig({
        strictPins: true,
        lockdownManifest: { ALPHA_VALUES: "tests/alpha.test.mjs" },
      }),
    }),
    "missing-lockdown",
    /strict mode requires a raw-text import statement naming symbol ALPHA_VALUES from a source module/i,
  );
});

test("runCli supports an adopter session-authority fixture and diagnoses an omitted manifest entry", (t) => {
  const repoRoot = createTempRepo(t);
  writeRepoFile(
    repoRoot,
    "src/session-policy.mjs",
    'export const SESSION_AUTHORITY_VALUES = Object.freeze(["read", "write"]);\n',
  );
  writeLockdown(repoRoot, "tests/session-policy.test.mjs", [
    'import assert from "node:assert/strict";',
    'import { SESSION_AUTHORITY_VALUES } from "../src/session-policy.mjs";',
    "",
    'assert.deepEqual([...SESSION_AUTHORITY_VALUES].sort(), ["read", "write"]);',
  ]);

  const stdout = captureStream();
  const stderr = captureStream();
  assert.equal(
    runCli({
      repoRoot,
      config: makeConfig({
        scanRoots: ["src"],
        lockdownManifest: {
          SESSION_AUTHORITY_VALUES: "tests/session-policy.test.mjs",
        },
      }),
      stdout: stdout.stream,
      stderr: stderr.stream,
    }),
    0,
  );

  const missingManifestStderr = captureStream();
  assert.equal(
    runCli({
      repoRoot,
      config: makeConfig({ scanRoots: ["src"] }),
      stdout: captureStream().stream,
      stderr: missingManifestStderr.stream,
    }),
    1,
  );
  assert.match(missingManifestStderr.output.join(""), /lockdown coverage \[uncategorized\]/);
});

for (const extension of ['js', 'ts']) test('rejects source roots containing only .' + extension, t => {
  const repoRoot = createTempRepo(t);
  writeExport(repoRoot, 'src/alpha.' + extension);
  assert.throws(() => findFrozenExports({ repoRoot, config: makeConfig() }), /contains no \.mjs files; the gate scans only \.mjs/);
});
