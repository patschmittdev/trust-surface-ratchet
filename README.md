# Trust Surface Ratchet

A permission mode, redaction category, or other closed security list can change
inside a routine edit while functional tests stay green. A pinned-list test
makes a membership change fail against an explicit expectation. The coverage
gate flags supported frozen exports that have no registered test or exemption;
a person still decides whether the change is safe.

## Quick start

Use Node.js 22 or 24. No package installation is required. From the clone root:

```sh
npm test
npm run check:lockdowns
```

See the [permission-mode example](examples/permission-modes/) and the canonical
[practice](practice.md) for adoption steps, review questions, and stopping
conditions.

## What the gate checks

Within configured .mjs source roots and supported syntax, the gate:

- reports uncategorized frozen exports;
- reports stale, duplicate, or ambiguous manifest entries;
- rejects invalid, escaping, overlapping, or symlinked configured paths;
- checks that each registered export points to a readable test file naming
  the symbol and containing a deep-equality assertion.

The default test-shape check can be satisfied by a comment. Optional
`strictPins: true` additionally requires an import statement naming the symbol, matched as raw text,
so a commented-out import also matches; it does not tie the assertion to the symbol. Both are heuristics: neither
proves that a pin executes or covers the complete list. Run the real tests.
See [gate configuration and syntax](gate/README.md).

## Limits

- Evidence is first-party: the practice comes from the author's own private runtime and has no independent adoption data.

This is a review tripwire, not a runtime security boundary. It cannot establish
that a classification is correct, an expected list is safe, a test is
semantically complete, every relevant list is registered, or runtime behavior
matches the recorded list. Maintainers can change or override the checks.
Approving a bad expected list moves the tripwire in the wrong direction.

The project is a reference pattern and JavaScript example. It does not claim
external validation, a novel security primitive, or broad language coverage.

The [guide](guide/README.md) contains a case study, diagrams, a fixture, a standalone
Lean model, and experimental research.

## License and participation

Code is [Apache-2.0](LICENSE); guide prose and diagrams are CC BY 4.0.
See [NOTICE](NOTICE) and [guide/LICENSE](guide/LICENSE) for the license map.

See [Security](SECURITY.md) for vulnerability reporting and
[Contributing](CONTRIBUTING.md) for checks and contribution guidance.

Everything outside guide/ prose and diagrams, including root docs such as
practice.md, is Apache-2.0.
