# Lean proof corpus

This standalone Lean model describes capability restriction and structural
audit/hash reductions. The proofs are not bound to the gate's code. No
JavaScript-to-model equivalence, runtime integration, or production system is
verified here.

The corpus contains **43 theorem declarations** and zero `sorry`.
It counts theorem and lemma declarations with optional attributes and modifiers:
TrustTier 10, SingleHop 16, MultiHop 8, AuditChain 7, and CapabilityHash 2.

The proofs are kernel-checked, conditional on the declared axioms below; some proofs also use Lean's standard axioms `propext` and `Quot.sound`:

| File and line | Declaration and assumption |
| --- | --- |
| [AuditChain.lean:84](Proofs/AuditChain.lean#L84) | `Bytes`: opaque type. |
| [AuditChain.lean:85](Proofs/AuditChain.lean#L85) | `Hash`: opaque type. |
| [AuditChain.lean:86](Proofs/AuditChain.lean#L86) | `Key`: opaque type. |
| [AuditChain.lean:87](Proofs/AuditChain.lean#L87) | `Sig`: opaque type. |
| [AuditChain.lean:88](Proofs/AuditChain.lean#L88) | `Record`: opaque type. |
| [AuditChain.lean:96](Proofs/AuditChain.lean#L96) | `enc`: opaque record/hash/position encoding. |
| [AuditChain.lean:99](Proofs/AuditChain.lean#L99) | `H`: opaque hash function. |
| [AuditChain.lean:102](Proofs/AuditChain.lean#L102) | `mac`: opaque keyed signature function. |
| [AuditChain.lean:117](Proofs/AuditChain.lean#L117) | `enc_injective`: distinct payloads encode differently. |
| [AuditChain.lean:132](Proofs/AuditChain.lean#L132) | `H_collision_resistant`: hash injectivity. |
| [AuditChain.lean:143](Proofs/AuditChain.lean#L143) | `mac_injective_in_msg`: message injectivity for a fixed key. |
| [CapabilityHash.lean:87](Proofs/CapabilityHash.lean#L87) | `Bytes`: opaque type. |
| [CapabilityHash.lean:88](Proofs/CapabilityHash.lean#L88) | `Hash`: opaque type. |
| [CapabilityHash.lean:110](Proofs/CapabilityHash.lean#L110) | `Invariant`: opaque invariant type. |
| [CapabilityHash.lean:117](Proofs/CapabilityHash.lean#L117) | `encInvariant`: opaque invariant encoding. |
| [CapabilityHash.lean:120](Proofs/CapabilityHash.lean#L120) | `H`: opaque hash function. |
| [CapabilityHash.lean:138](Proofs/CapabilityHash.lean#L138) | `encInvariant_injective`: distinct invariants encode differently. |
| [CapabilityHash.lean:145](Proofs/CapabilityHash.lean#L145) | `H_collision_resistant`: hash injectivity. |

These injectivity assumptions are idealizations, stronger than computational
collision resistance; they do not establish SHA-256 or HMAC security.

## What is proved

- Trust-tier intersection is a rank-level meet; permission modes follow the
  same no-widening shape.
- A single delegation hop cannot widen modeled parent or requested capability.
- A multi-hop result is no more capable than every ancestor in its chain.
- Audit-chain and capability-hash properties reduce to the stated assumptions
  or structural properties of the model.

Only modeled axes are covered. Inspect the statements and assumptions before
applying the model to another system; implementation correspondence needs
separate evidence.

## Build

From the repository root, with the toolchain in [lean-toolchain](lean-toolchain):

```sh
cd guide/proofs
lake build
```

The build must succeed and the corpus must remain free of `sorry`.
See the [proof index](PROOF_INDEX.md) and
[reading guide](reading-the-formal-proof.md).

