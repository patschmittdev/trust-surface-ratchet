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

- [Ratchet loop](diagrams/ratchet-loop.svg): what happens when a pinned list changes.
- [Snapshot boundary](diagrams/snapshot-boundary.svg): a worked example of a closed
  list at a trust boundary. The host-only field set stripped before model-facing
  output is the kind of list the practice pins.

## Ratchet fixture

The dependency-free [fixture](examples/ratchet-fixture/README.md) checks a boundary
file against a content-hashed manifest and demonstrates a failing byte change.
Refreshing the manifest does not establish that a human reviewed the change.

Code is Apache-2.0; guide prose and diagrams are CC BY 4.0. See [NOTICE](../NOTICE)
and [LICENSE](LICENSE).
