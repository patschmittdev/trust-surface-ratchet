# Trust Surface Ratchet guide

A field guide of proposed practices for reviewing AI-agent runtime trust surfaces.
It describes ways to make selected trust-boundary changes explicit with pinned
tests, threat-naming comments, and optional CI checks. The canonical description
is [practice.md](../practice.md). These are patterns to adapt, not a framework
to install or proof that a system is secure.

## Case study

[Boundary widening](case-studies/boundary-widening.md) shows an anonymized change
and the limits of the review tripwire.

## Diagrams

- [Sanitizer pipeline](diagrams/sanitizer-pipeline.svg): bounded normalization.
- [Snapshot boundary](diagrams/snapshot-boundary.svg): host and model-visible state.
- [Redact versus sanitize](diagrams/redact-vs-sanitize.svg): read and write controls.
- [Pre-egress guards](diagrams/pre-egress-guards.svg): host policy interception.
- [Transitive linking](diagrams/transitive-linking.svg): host-owned delegation context.
- [Worktree lifecycle](diagrams/worktree-lifecycle.svg): worker isolation and diffs.

## Ratchet fixture

The dependency-free [fixture](examples/ratchet-fixture/README.md) checks a boundary
file against a content-hashed manifest and demonstrates a failing byte change.
Refreshing the manifest does not establish that a human reviewed the change.

## Proofs

The [standalone Lean model](proofs/README.md) is kernel-checked, conditional on
the declared axioms listed there with source locations. It models capability
restriction and audit/hash reductions; it is not bound to the gate's code or
proof of any runtime's security.

## Research: EXPERIMENTAL

[BFT and stigmergy](research/bft-stigmergy/README.md) contains prior art,
simulation results, a threat model, and a critique. Conclusions depend on the
model's parameters and assumptions; these are findings, not recipes.

Code is Apache-2.0; guide prose and diagrams are CC BY 4.0. See [NOTICE](../NOTICE)
and [LICENSE](LICENSE).

The neutrality guard applies the newline- or comma-separated private
`NEUTRALITY_DENYLIST` repo-wide to text and paths. Entries cannot span lines;
identifier entries match identifier forms in any case, with `_`/`-` separators,
embedded parts, and affixes, within a single whitespace-delimited word. Entries
written with a space or hyphen also match spaced prose. A `=` prefix makes an
entry whole-word (no affixes). Public pattern rules apply to guide text
files by extension, excluding guide/scripts. Whenever a list is configured,
all matched values are withheld unless `NEUTRALITY_SHOW_VALUES=true`;
matching paths are also withheld. Fork pull requests do not receive the list.
Pushes to non-fork repositories require it; local runs can set
`NEUTRALITY_REQUIRE_DENYLIST=true` to require it.
