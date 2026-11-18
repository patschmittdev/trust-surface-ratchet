# The reference Trust Surface Ratchet gate

This directory contains a dependency-free Node.js gate for one narrow part
of the [Trust Surface Ratchet practice](../practice.md).

The gate is only the defense-in-depth layer. It helps reveal uncategorized
closed exports, but it does not prove that a boundary is complete, a list is
safe, or runtime behavior enforces the intended trust boundary.

## What it checks

Within configured source roots, the gate discovers exports matching:

```js
export const NAME = Object.freeze(...)
export const NAME = makeFrozenSet(...)
```

`NAME` must use uppercase constant syntax. Each discovered name must appear
in exactly one of:

- `LOCKDOWN_MANIFEST`, mapped to a pinned-list test file; or
- `NON_LOAD_BEARING`, for an explicitly exempted mechanical constant.

The default discovery set recognizes `Object.freeze` and `makeFrozenSet`.
Adopters may add simple freeze helper names through configuration, but every
added helper is a reviewed claim about what counts as a closed export in
that repository.

Each configured source root must contain at least one `.mjs` file; other extensions
are not scanned. An empty `.mjs` scan is a configuration error.

For each manifest entry, the gate checks that the path stays within the
repository, names a readable regular file, mentions the symbol, and
contains an `assert.deepEqual(...)` or `assert.deepStrictEqual(...)` call.
It also reports stale entries, duplicate categorization, duplicate export
names, invalid paths, and unreadable or overlapping scan roots.

Strict pin mode additionally requires an import statement naming the symbol,
matched as raw text, so a commented-out import also matches; it does not tie
the deep-equality assertion to the symbol. It remains a heuristic; run the real tests.

This is an **exhaustive-looking artifact check**, not semantic test
analysis. The gate cannot judge the classification, expected values,
actual exhaustiveness, completeness of registration, or runtime behavior.
Only executing and reviewing the pinned-list test provides useful evidence.

## Files

- [check-lockdown-coverage.mjs](check-lockdown-coverage.mjs) implements the
  scanner, validation, and CLI.
- [lockdown-coverage.test.mjs](lockdown-coverage.test.mjs) covers the
  repository configuration and causal failure contracts.

## Adoption

1. Copy `check-lockdown-coverage.mjs` into a repository-local `scripts/`
   directory.
2. Copy or adapt `lockdown-coverage.test.mjs` into the test tree.
3. Adjust `REPO_ROOT` if the script is not one directory below the root.
4. Set `SCAN_ROOTS` to disjoint, repository-relative source directories.
5. Map each selected closed export to its pinned-list test in
   `LOCKDOWN_MANIFEST`.
6. Put other discovered frozen exports in `NON_LOAD_BEARING` only after
   deciding they do not represent a relevant trust list.
7. Run both the test suite and standalone gate in CI.
8. After the default gate is working, optionally set `strictPins: true` in
   the gate configuration to require direct named imports in registered
   pins. This is stronger but remains a non-executing heuristic.

Example package scripts:

```json
{
  "scripts": {
    "test": "node --test",
    "check:lockdowns": "node scripts/check-lockdown-coverage.mjs"
  }
}
```

No package installation is required for the copied gate itself.

## Failure contracts

| Kind | Meaning | Review action |
| --- | --- | --- |
| `configuration` | A root, manifest, exemption, or path is malformed or unreadable. | Correct the configuration; do not treat an unscanned tree as clean. |
| `uncategorized` | A supported frozen export is in neither category. | Register a pinned-list test or justify an exemption. |
| `missing-lockdown` | The associated artifact is missing or fails the superficial shape check. | Add or repair the real pinned-list test. |
| `stale-manifest` | A configured name was not discovered. | Restore the export or remove the stale entry after review. |
| `duplicate-categorization` | A name is both registered and exempted. | Choose one category. |
| `ambiguous-export` | The same name appears in multiple discovered files. | Remove the ambiguity before using a name-keyed manifest. |

The CLI writes a summary to standard output, diagnostics to standard
error, and returns status `1` when any violation exists.

## Why it stays small

- It uses only Node.js built-ins.
- It scans local files and makes no network calls.
- Configuration is ordinary JavaScript intended to be vendored and
  reviewed with the repository.
- It rejects ambiguous configuration rather than guessing.

## Deliberate limitations

- The scanner is a regular expression, not a JavaScript or TypeScript
  parser. Formatting, aliases, lowercase exports, other extensions, and
  other freeze helpers are invisible unless the adopter extends and tests
  discovery.
- Configured roots and lockdown paths reject symlinked path components.
  Symlinked directories encountered during discovery are not followed.
  This keeps traversal inside the configured real tree but can omit code
  intentionally stored behind symlinks.
- `Object.freeze` is shallow. Nested values need their own immutability and
  behavior checks.
- The manifest is keyed by export name, so duplicate names are rejected.
- The gate does not know whether all trust lists have been selected.

The included tests exercise path handling and CLI behavior on supported
Node.js versions. CI runs them on Linux and Windows because path
containment, separators, and line endings are relevant to a vendored
filesystem gate.
