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

For proof changes, use the Lean toolchain recorded in
[lean-toolchain](guide/proofs/lean-toolchain), then run:

```sh
cd guide/proofs
lake build
```

Keep the corpus free of `sorry`. If a check cannot run, report the missing
validation instead of calling it passed.

For registered list and gate-configuration changes, follow the review questions
in the canonical [practice](practice.md). A green gate does not approve a list.

For ordinary gate defects, include the smallest source tree and configuration
that reproduce the behavior. Follow [SECURITY.md](SECURITY.md) for suspected
vulnerabilities and the [Code of Conduct](CODE_OF_CONDUCT.md) in all discussions.
Do not include secrets, customer data, or private source in contributions.

Contributions follow the license map in [NOTICE](NOTICE) and
[guide/LICENSE](guide/LICENSE): code, scripts, and Lean source are Apache-2.0;
guide prose and diagrams are CC BY 4.0 unless a file states otherwise.

Everything outside guide/ prose and diagrams, including root docs such as
practice.md, is Apache-2.0.

The neutrality guard scans repository text and paths using the newline- or comma-separated
`NEUTRALITY_DENYLIST` secret; public rules cover the guide. Values are withheld unless
`NEUTRALITY_SHOW_VALUES=true`. Non-fork pushes require the list; local runs can use
`NEUTRALITY_REQUIRE_DENYLIST=true` to require it.
