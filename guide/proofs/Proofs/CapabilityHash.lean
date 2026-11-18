-- Capability-hash partition correctness: structural reduction to
-- cryptographic primitives.
--
-- This module reduces a runtime-style trust property to a small set
-- of named cryptographic axioms. The pattern mirrors AuditChain:
-- model the primitive as opaque, axiomatize its security-relevant
-- property, then prove the higher-level guarantee as a structural
-- consequence.
--
-- The property
-- ------------
--
-- A worker pool can partition connections by `capabilityHash`. Two
-- modeled delegations share a capability hash iff their
-- invariant axes (tenant identifier, permission mode, model, trust tier,
-- ancestry digest, directive digest, binary fingerprint,
-- actor identity, runtime family) are identical -- because their
-- canonical-JSON encoding of those nine axes hashes to the same
-- value.
--
-- In the model, differing invariant axes imply different hashes under
-- the encoding and hash-injectivity axioms. Runtime connection
-- partitioning is not established by this model.
--
-- The implementation shape
-- -----------
--
-- A representative capability-hash computation canonicalizes
-- the nine axes, hashes the result, and prefixes it with a version tag.
-- The trivial-sentinel
-- branch (all axes null / empty / null) returns `"trivial"` instead;
-- that branch is the back-compat path for single-user hosts with no
-- declared authority, NOT a partition-defining branch, so it is not
-- modeled here.
--
-- The Lean abstraction
-- --------------------
--
-- We axiomatize the cryptographic + encoding layer exactly as
-- AuditChain.lean did for the audit chain, then prove hash injectivity under those axioms
-- as a one-line composition:
--
--   * `encInvariant : Invariant → Bytes` -- canonical-JSON encoding
--     of the nine-axis invariant record.
--   * `H : Bytes → Hash` -- SHA-256.
--   * Two axioms: `encInvariant_injective`, `H_collision_resistant`.
--
-- Theorems proved
-- ---------------
--
--   * `capabilityHash_injective`            (HEADLINE:
--                                            distinct invariants
--                                            have distinct hashes; runtime
--                                            pools are not established)
--   * `capabilityHash_eq_iff_axes_eq`       (iff
--                                            characterization;
--                                            useful for runtime
--                                            reasoning about pool
--                                            sharing)
--
-- What this slice does NOT cover:
--
--   * SHA-256 is NOT proven secure. It is an AXIOM (reused from
--     AuditChain.lean).
--   * The empty-invariant sentinel back-compat branch is out of
--     scope; this model assumes non-trivial partition axes.
--   * The runtime-side decision "should two invariants share a pool
--     slot" is modeled at the hash level only; the actual factory-pool
--     code path that checks capability-hash equality
--     is JS reality, not modeled here.
--   * Cross-axis encoding equivalences (e.g. two different
--     actor identity shapes encoding to the same canonical-JSON
--     output) are subsumed by `encInvariant_injective`; if that
--     axiom is violated the modeled hash guarantee fails with it, which
--     is the operational read of pipe-join style collision bugs.

namespace TrustSurface.CapabilityHash

/-! ## Abstract cryptographic primitives

These mirror the corresponding abstractions in `Proofs/AuditChain.lean`
(AuditChain.lean). They are deliberately re-declared here rather than imported
so each slice's axiom set is self-contained and a reviewer can read the
trust boundary in one file.
-/

axiom Bytes : Type
axiom Hash : Type

/--
The closed nine-axis invariant record.

The nine partition-defining axes:

  1. tenant identifier                  -- host-stamped tenant id
  2. permission mode          -- safe / yolo
  3. model                   -- requested model id (or "")
  4. trust tier                  -- trust ceiling (or "")
  5. ancestry digest            -- parent's own capabilityHash (or "")
  6. directive digest         -- declared envelope hash (or "")
  7. binary fingerprint -- host-stamped binary fingerprint (or "")
  8. actor identity           -- canonical-JSON form of the identity
                                record (or "")
  9. runtime family            -- runtime family id (or "")

Modeled as opaque because we never inspect their internal structure;
the modeled hash guarantee requires that distinct invariants
encode to distinct bytes.
-/
axiom Invariant : Type

/--
Canonical-JSON encoding of the nine-axis invariant payload.

Canonical encoding of the invariant fields.
-/
axiom encInvariant : Invariant → Bytes

/-- SHA-256. Mirrors the runtime's SHA-256 hashing. -/
axiom H : Bytes → Hash

/-! ## Cryptographic axioms (the trust boundary)

Two axioms; reused conceptually from AuditChain.lean (`AuditChain.lean`).
Each names the security assumption it depends on; if either fails,
the modeled hash guarantee fails with it.
-/

/--
**Canonical-JSON injectivity over the nine-axis invariant.** Two
distinct invariants must encode to distinct byte strings.

This is the property a canonical structured encoder should provide:
stable key ordering, no whitespace ambiguity, and no encoding
aliasing. Pipe-join style collision classes are exactly what this
axiom rules out.
-/
axiom encInvariant_injective :
    ∀ (i₁ i₂ : Invariant), encInvariant i₁ = encInvariant i₂ → i₁ = i₂

/--
**Idealized SHA-256 collision-resistance** = injectivity in the
random-oracle model. Reused from AuditChain.lean.
-/
axiom H_collision_resistant : ∀ (x y : Bytes), H x = H y → x = y

/-! ## Capability hash construction -/

/--
The capability hash. `H ∘ encInvariant`, after canonicalization.
Mirrors the non-trivial branch of the capability-hash computation
(the versioned-prefix-plus-hex form); the trivial-sentinel branch is out of
scope (see preamble).
-/
noncomputable def capabilityHash (i : Invariant) : Hash :=
  H (encInvariant i)

/-! ## HEADLINE -- capability-hash injectivity -/

/--
**HEADLINE: capability-hash injectivity.** A collision
in `capabilityHash` forces equality of the underlying invariants.

In this model, different invariants have different capability hashes
under the encoding and hash-injectivity axioms. This does not establish
a runtime pool-allocation property.

Reduction: `capabilityHash = H ∘ encInvariant`, so a collision in
`capabilityHash` is a collision in `H`, which by
`H_collision_resistant` is a collision in `encInvariant`, which by
`encInvariant_injective` is invariant equality.
-/
theorem capabilityHash_injective
    (i₁ i₂ : Invariant)
    (h : capabilityHash i₁ = capabilityHash i₂) :
    i₁ = i₂ := by
  unfold capabilityHash at h
  have henc : encInvariant i₁ = encInvariant i₂ := H_collision_resistant _ _ h
  exact encInvariant_injective _ _ henc

/-! ## iff characterization of hash equality -/

/--
**Hash equality iff invariant equality under the encoding and hash-injectivity
axioms.** Equal capability hashes imply equal invariants.
Runtime pool partitioning is not established by this model.

Combines `capabilityHash_injective` (the forward direction proved
above) with the trivial `congrArg` direction (equal invariants
produce equal hashes by function-equality).
-/
theorem capabilityHash_eq_iff_axes_eq (i₁ i₂ : Invariant) :
    capabilityHash i₁ = capabilityHash i₂ ↔ i₁ = i₂ := by
  refine ⟨capabilityHash_injective i₁ i₂, ?_⟩
  intro h
  rw [h]

end TrustSurface.CapabilityHash
