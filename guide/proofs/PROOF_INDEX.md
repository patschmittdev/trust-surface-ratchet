# Proof index

The corpus has **43 theorem declarations** and zero `sorry`.
The [counting rule and declared axioms](README.md) qualify this inventory.

| Module | Count | Modeled property |
| --- | ---: | --- |
| `Proofs/TrustTier.lean` | 10 | Trust-tier intersection is the rank-level meet. |
| `Proofs/SingleHop.lean` | 16 | One hop cannot widen parent or requested capability. |
| `Proofs/MultiHop.lean` | 8 | The folded result is bounded by every ancestor. |
| `Proofs/AuditChain.lean` | 7 | Equal constructed chains imply equal input record lists; hash/signature reductions use encoding and cryptographic axioms. |
| `Proofs/CapabilityHash.lean` | 2 | Equal capability hashes imply equal invariants under encoding and hash-injectivity assumptions. |

`multiHop_le_member` states the modeled no-widening property for every capability
in the ancestor chain.

These proofs concern a standalone model and are not bound to the gate's code.
They are kernel-checked, conditional on the declared axioms listed with
[file and line locations](README.md); some proofs also use Lean's standard axioms `propext` and `Quot.sound`. Cryptographic security and implementation
correspondence are not proved.

