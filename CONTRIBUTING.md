# Contributing

Keep changes focused. Explain the failure mode or documentation need and any
remaining limits. Gate behavior changes need tests that reproduce the failure;
discovery extensions need a concrete source pattern. Keep claims tied to evidence.

Use Node.js 22 or 24. No package installation is required. From the repository
root, run:

```sh
npm test
npm run check:lockdowns
npm run test:fixture
npm run check:fixture
npm run check:fixture:strict
npm run check:guide-links
npm run check:guide-neutrality
node guide/examples/ratchet-fixture/check
```

If a check cannot run, report the missing validation instead of calling it passed.

For registered list and gate-configuration changes, follow the review questions
in the canonical [practice](practice.md). A green gate does not approve a list.

For ordinary gate defects, include the smallest source tree and configuration
that reproduce the behavior. Follow [SECURITY.md](SECURITY.md) for suspected
vulnerabilities and the [Code of Conduct](CODE_OF_CONDUCT.md) in all discussions.
Do not include secrets, customer data, or private source in contributions.

Contributions follow the license map in [NOTICE](NOTICE) and
[guide/LICENSE](guide/LICENSE): code and scripts are Apache-2.0;
guide prose and diagrams are CC BY 4.0 unless a file states otherwise.

Everything outside guide/ prose and diagrams, including root docs such as
practice.md, is Apache-2.0.

The neutrality guard applies the newline- or comma-separated private
`NEUTRALITY_DENYLIST` to repository text and paths, excluding
`.git`, `node_modules`, and symlinked directories, which are not
traversed. NUL-containing files receive only the private list checks.
Entries cannot span lines;
identifier entries match identifier forms in any case, with `_`/`-` separators,
embedded parts, and affixes, within a single whitespace-delimited word. Entries
written with a space or hyphen also match spaced prose. A `=` prefix makes an
entry whole-word (no affixes). Public pattern rules apply to guide text
files by extension, excluding guide/scripts. Whenever a list is configured,
all matched values are withheld unless `NEUTRALITY_SHOW_VALUES=true`;
paths and printed text are also withheld when their lowercase alphanumeric
projection contains an entry's projection. The guard does not run in CI; the
maintainer runs it with the private list before pushing. Without a list, only
the public pattern rules run; set `NEUTRALITY_REQUIRE_DENYLIST=true` to fail
instead.
