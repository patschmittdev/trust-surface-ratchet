-- Audit-chain construction and per-record injectivity reductions.
--
-- recordHash_injective uses enc_injective and H_collision_resistant.
-- signature_injective_for_fixed_key additionally uses mac_injective_in_msg.
-- chainFrom_nil and chainFrom_cons unfold construction; chainFrom_length,
-- chainFrom_injective_records and chainFrom_verifies are structural results
-- using propext and opaque H, Hash, Key, Record, Sig, enc and mac only.
-- No theorem proves verifyChain rejects modified, reordered or truncated chains.
-- A prefix of a valid chain also verifies. Tail truncation detection needs an
-- external anchor such as a stored head hash or record count.
--
-- The implementation shape being modeled
-- ------------------------------
--
-- The runtime's record-signing operation does:
--
--     encoded payload = canonical encoding({record, prevHash, position,
--                                           format version, algorithm tag})
--     recordHash  = SHA-256(encoded payload)
--     signature   = HMAC-SHA-256(recordHash, key)
--
-- The runtime's chain-verification operation walks the records left-to-right, requires position
-- contiguity, requires `prevHash[i+1] = recordHash[i]` (genesis sentinel
-- for i=0), recomputes `recordHash` from the base record, and recomputes
-- the signature with the supplied key.
--
-- The Lean abstraction
-- --------------------
--
-- We model the three cryptographic functions as opaque (uninterpreted)
-- and pin their security-relevant property as a typed axiom:
--
--   * `enc : Record → Hash → Nat → Bytes` -- canonical-JSON encoding of
--     the three-axis hash payload. The format version and algorithm tag are
--     constants in the runtime; we fold them into `enc`'s codomain.
--   * `H : Bytes → Hash` -- SHA-256.
--   * `mac : Hash → Key → Sig` -- HMAC-SHA-256.
--
-- The three axioms are:
--
--   * `enc_injective`            -- canonical-JSON is injective on the
--                                   three-axis payload.
--   * `H_collision_resistant`    -- idealized SHA-256 is injective (the
--                                   random-oracle / ideal-hash
--                                   abstraction).
--   * `mac_injective_in_msg`     -- for a fixed key, HMAC is injective in
--                                   its message argument (the PRF
--                                   abstraction restricted to a single
--                                   key).
--
-- Theorems proved
-- ---------------
--
--   * `recordHash_injective`
--   * `signature_injective_for_fixed_key`
--   * `chainFrom_length`                  (structural)
--   * `chainFrom_injective_records`       (structural record projection)
--   * `chainFrom_verifies`                (soundness of
--                                          construction)
--
-- Follow-up: the completeness direction `verifyChain → ∃! rs, chain =
-- chainFrom k prev0 pos0 rs`. The current `verifyChain` predicate is
-- supplied so a future slice can prove that direction without re-
-- introducing the cryptographic axioms.
--
-- What this slice does NOT cover:
--
--   * SHA-256 / HMAC are NOT proven secure. They are AXIOMS. Anyone who
--     finds a real SHA-256 collision invalidates the reduction's
--     premise, not the reduction itself.
--   * Key compromise is not modeled. A holder of `key` can produce a
--     verifying alternate chain; the JS path defends against this
--     operationally (freshness watchdog, host-side key separation),
--     not cryptographically.
--   * Missing records require an external freshness or completeness anchor.
--     Verification alone accepts valid prefixes and does not detect tail loss.

--
--
namespace TrustSurface.AuditChain

/-! ## Abstract cryptographic primitives -/

axiom Bytes : Type
axiom Hash : Type
axiom Key : Type
axiom Sig : Type
axiom Record : Type

/--
Canonical encoding of the per-record hash payload. Mirrors the JS
canonical encoding of ({record, prevHash, position, format version,
algorithm tag}), where the format version and algorithm tag are constants we
fold into `enc`.
-/
axiom enc : Record → Hash → Nat → Bytes

/-- SHA-256. Mirrors the runtime's SHA-256 hashing. -/
axiom H : Bytes → Hash

/-- HMAC-SHA-256. Mirrors the runtime's HMAC signing of data with a key. -/
axiom mac : Hash → Key → Sig

/-! ## Cryptographic axioms (the trust boundary) -/

/--
**Canonical-JSON injectivity.** Two distinct `(record, prevHash,
position)` triples must encode to distinct byte strings.

A canonical JSON encoder must provide unambiguous bytes:
its encoding must have stable key
ordering, no whitespace ambiguity, no encoding aliasing. The
pipe-join / colon-join class of encoder bugs that let two distinct
inputs collide on the encoded bytes is exactly what this axiom rules
out.
-/
axiom enc_injective :
    ∀ (r₁ r₂ : Record) (p₁ p₂ : Hash) (n₁ n₂ : Nat),
      enc r₁ p₁ n₁ = enc r₂ p₂ n₂ → r₁ = r₂ ∧ p₁ = p₂ ∧ n₁ = n₂

/--
**Idealized SHA-256 collision-resistance** = injectivity in the
random-oracle model. The real SHA-256 has a 256-bit output and an
infinite input space, so it is not literally injective; the
idealization captures the cryptographic fact that finding a collision
is computationally infeasible.

The reduction below treats every `H x = H y` derivation as license to
conclude `x = y`. In the real runtime, the corresponding license is
"we have not seen a SHA-256 collision yet."
-/
axiom H_collision_resistant : ∀ (x y : Bytes), H x = H y → x = y

/--
**HMAC injectivity in the message argument for a fixed key.** For a
fixed HMAC key `k`, distinct messages produce distinct tags.

This is the PRF abstraction restricted to a single key. HMAC's
security as a PRF concerns pseudorandom outputs for an unknown key.
Message injectivity for a fixed key is an idealization stronger than
computational collision resistance, not a consequence of PRF security.
-/
axiom mac_injective_in_msg :
    ∀ (h₁ h₂ : Hash) (k : Key), mac h₁ k = mac h₂ k → h₁ = h₂

/-! ## Chain construction -/

/--
The per-record hash that becomes the `recordHash` field of the chain
envelope. Composition of `H` and `enc` on the three-axis payload.
-/
noncomputable def recordHash (r : Record) (prev : Hash) (pos : Nat) : Hash :=
  H (enc r prev pos)

/--
A signed audit-chain entry. Mirrors the JS object that
the record-signing operation returns, restricted to the chain-load-bearing fields
(the format version and algorithm tag are constants in the runtime).
-/
structure Entry where
  record : Record
  prevHash : Hash
  position : Nat
  recordHash : Hash
  signature : Sig

/-- Sign one record. Mirrors the runtime's record-signing operation. -/
noncomputable def signRecord (k : Key) (prev : Hash) (pos : Nat) (r : Record) : Entry :=
  { record := r,
    prevHash := prev,
    position := pos,
    recordHash := recordHash r prev pos,
    signature := mac (recordHash r prev pos) k }

/--
Build a chain of signed entries from a starting `(prev, pos)` state
by folding `signRecord` across the input record list. Each entry's
`prevHash` is the previous entry's `recordHash`; positions are
contiguous starting at `pos`.

The recursive (List Record) argument is the LAST positional arg so
Lean's structural recursion check picks it up.
-/
noncomputable def chainFrom (k : Key) (prev : Hash) (pos : Nat) (rs : List Record) : List Entry :=
  match rs with
  | []      => []
  | r :: rs =>
    signRecord k prev pos r ::
      chainFrom k (recordHash r prev pos) (pos + 1) rs
termination_by rs.length

/--
Unfolding lemma for `chainFrom` on the empty list. Manually stated so
downstream proofs do not depend on the well-founded equation
compiler's auto-generated lemmas (which can be unwieldy under
`simp` / `rfl`).
-/
@[simp] theorem chainFrom_nil (k : Key) (prev : Hash) (pos : Nat) :
    chainFrom k prev pos [] = [] := by
  rw [chainFrom]

/--
Unfolding lemma for `chainFrom` on `r :: rs`. Manually stated for the
same reason as `chainFrom_nil`.
-/
@[simp] theorem chainFrom_cons (k : Key) (prev : Hash) (pos : Nat)
    (r : Record) (rs : List Record) :
    chainFrom k prev pos (r :: rs) =
      signRecord k prev pos r ::
        chainFrom k (recordHash r prev pos) (pos + 1) rs := by
  rw [chainFrom]

/-! ## recordHash injectivity (collision-resistance lifted) -/

/--
**recordHash injectivity.** A collision in `recordHash`
forces a collision in the underlying `(record, prevHash, position)`
triple.

Reduction: `recordHash = H ∘ enc`, so a collision in `recordHash` is a
collision in `H`, which by `H_collision_resistant` is a collision in
`enc`, which by `enc_injective` is equality of the three input axes.
-/
theorem recordHash_injective
    (r₁ r₂ : Record) (p₁ p₂ : Hash) (n₁ n₂ : Nat)
    (h : recordHash r₁ p₁ n₁ = recordHash r₂ p₂ n₂) :
    r₁ = r₂ ∧ p₁ = p₂ ∧ n₁ = n₂ := by
  unfold recordHash at h
  have henc : enc r₁ p₁ n₁ = enc r₂ p₂ n₂ := H_collision_resistant _ _ h
  exact enc_injective _ _ _ _ _ _ henc

/-! ## signature injectivity for a fixed key -/

/--
**signature injectivity for a fixed key.** If two signed
records share both key and signature, they share their underlying
`(record, prevHash, position)` triple.

This composes `mac_injective_in_msg` (which gives equality of the
hashed messages) with `recordHash_injective` (which lifts that to
equality of the underlying axes).
-/
theorem signature_injective_for_fixed_key
    (k : Key) (r₁ r₂ : Record) (p₁ p₂ : Hash) (n₁ n₂ : Nat)
    (hs : mac (recordHash r₁ p₁ n₁) k = mac (recordHash r₂ p₂ n₂) k) :
    r₁ = r₂ ∧ p₁ = p₂ ∧ n₁ = n₂ := by
  have hh : recordHash r₁ p₁ n₁ = recordHash r₂ p₂ n₂ :=
    mac_injective_in_msg _ _ _ hs
  exact recordHash_injective _ _ _ _ _ _ hh

/-! ## chainFrom is length-preserving (structural sanity) -/

/--
**chainFrom length.** The chain has one entry per input
record. Pure structural property; needs no cryptographic axiom.
-/
theorem chainFrom_length (k : Key) (prev : Hash) (pos : Nat)
    (rs : List Record) :
    (chainFrom k prev pos rs).length = rs.length := by
  induction rs generalizing prev pos with
  | nil => simp
  | cons r rs ih => simp [ih]

/-! ## HEADLINE -- chainFrom is injective in its record list -/

/--
**HEADLINE: chainFrom is injective in its record list.**
Two chains built from the same `(key, prev, pos)` starting state are
equal as `List Entry` iff their input record lists were equal.

This is a structural injectivity property of constructed entry lists.
It follows by projection of stored records and uses no cryptographic
axioms; it does not establish a runtime verification property.

Reduction shape: induction on `rs₁`. The head-entry equality forces
the records to be equal via projection on the `.record` field, then
the IH applies to the tails.

Note that we DO NOT require key separation: the same chain shape can
be forged by a holder of `k`. Key-compromise defense is operational
(audit-freshness watchdog), not cryptographic; see the module
preamble.
-/
theorem chainFrom_injective_records
    (k : Key) (prev : Hash) (pos : Nat) (rs₁ rs₂ : List Record)
    (h : chainFrom k prev pos rs₁ = chainFrom k prev pos rs₂) :
    rs₁ = rs₂ := by
  induction rs₁ generalizing prev pos rs₂ with
  | nil =>
    cases rs₂ with
    | nil => rfl
    | cons _ _ => simp at h
  | cons r rs ih =>
    cases rs₂ with
    | nil => simp at h
    | cons r' rs' =>
      simp only [chainFrom_cons, List.cons.injEq] at h
      obtain ⟨hhead, htail⟩ := h
      have hr : r = r' := by
        have hrec : (signRecord k prev pos r).record =
                    (signRecord k prev pos r').record :=
          congrArg Entry.record hhead
        simpa [signRecord] using hrec
      subst hr
      have := ih _ _ _ htail
      simp [this]

/-! ## soundness of construction (chains verify by construction) -/

/--
Predicate: one entry verifies against an expected `(prev, pos)` and
key. Mirrors the four per-entry checks in the runtime's chain-verification operation
(prevHash matches, position matches, recordHash recomputes, signature
re-verifies).

The format-version and algorithm-tag checks in the JS path are structural
constants we elided into `enc`.
-/
noncomputable def verifyEntry (k : Key) (expectedPrev : Hash) (expectedPos : Nat)
    (e : Entry) : Prop :=
  e.prevHash = expectedPrev ∧
  e.position = expectedPos ∧
  e.recordHash = recordHash e.record e.prevHash e.position ∧
  e.signature = mac e.recordHash k

/--
Predicate: a whole chain verifies starting from `(prev0, pos0)`.
Mirrors the runtime's chain-verification loop.
-/
noncomputable def verifyChain (k : Key) (prev0 : Hash) (pos0 : Nat) : List Entry → Prop
  | []        => True
  | e :: rest =>
    verifyEntry k prev0 pos0 e ∧
    verifyChain k e.recordHash (pos0 + 1) rest

/--
**soundness of construction.** A chain built by
`chainFrom` always satisfies `verifyChain`. The construction is
correct by definition; this theorem records the fact mechanically.

This is the "if you built it with `signRecord`, verification accepts
it" direction. The converse direction ("everything verification
accepts has this shape") is deferred to a follow-up slice; see the
module preamble.
-/
theorem chainFrom_verifies (k : Key) (prev : Hash) (pos : Nat)
    (rs : List Record) :
    verifyChain k prev pos (chainFrom k prev pos rs) := by
  induction rs generalizing prev pos with
  | nil =>
    rw [chainFrom_nil]
    trivial
  | cons r rs ih =>
    rw [chainFrom_cons]
    refine ⟨?_, ?_⟩
    · -- verifyEntry: each conjunct is rfl after unfolding signRecord.
      show verifyEntry k prev pos (signRecord k prev pos r)
      refine ⟨rfl, rfl, ?_, rfl⟩
      simp [signRecord]
    · -- Tail's expected prev is (signRecord ...).recordHash which is
      -- definitionally recordHash r prev pos.
      show verifyChain k (signRecord k prev pos r).recordHash (pos + 1)
        (chainFrom k (recordHash r prev pos) (pos + 1) rs)
      have heq : (signRecord k prev pos r).recordHash = recordHash r prev pos := rfl
      rw [heq]
      exact ih (recordHash r prev pos) (pos + 1)

end TrustSurface.AuditChain
