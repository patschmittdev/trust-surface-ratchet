-- Formal model and monotonicity proofs for trust-tier intersection.
--
-- Every theorem below is mechanically checked by `lake build` and
-- discharged by Lean's `decide` tactic over the finite 5-element
-- TrustTier type.
--
-- A representative implementation shape:
--
--     Rank each tier.
--     Intersection returns the lower-ranked argument,
--     choosing the first argument on a tie.
--     A null parent returns null.
--     A null child returns the parent.
--     Nullable handling wraps the intersection operation.
--     The lattice below models non-null tiers only.
--
-- with ranks:
--
--     untrusted=0, probationary=1, standard=2, trusted=3, verified=4
--
-- The nullable handling (`parentTier === null` / `childTier === null`)
-- is the operator-level wrapping that gates whether tier intersection
-- happens at all; it is not part of the lattice algebra and is
-- intentionally NOT modeled here. The Lean model is the
-- non-null lattice; see `intersect_rank_eq_min` below for the
-- headline property.
--
-- See ../README.md for the model limits and
-- ../reading-the-formal-proof.md for the reviewer-facing walkthrough.

namespace TrustSurface.TrustTier

/--
The closed set of trust tiers in the model.

A `deriving DecidableEq, Repr` is sufficient for the `decide` tactic
to discharge all the universally-quantified theorems below over
the finite 5-element type (5 × 5 = 25 case split at most).
-/
inductive TrustTier where
  | untrusted
  | probationary
  | standard
  | trusted
  | verified
  deriving DecidableEq, Repr

/--
Numeric rank of a trust tier. Higher = more trusted.

Used by `intersect` to pick the more-restrictive (lower-ranked) tier.
-/
def TrustTier.rank : TrustTier → Nat
  | .untrusted    => 0
  | .probationary => 1
  | .standard     => 2
  | .trusted      => 3
  | .verified     => 4

/--
Intersect two trust tiers. The result is the more-restrictive
(lower-ranked) of the two. On a tie (equal ranks, which on this
finite type also implies equal tiers), returns the first argument
-- matching the JS `<=` branch.

This IS the lattice meet (greatest lower bound) on `(TrustTier, ≤)`
under the rank ordering. The theorems below establish that
formally.
-/
def TrustTier.intersect : TrustTier → TrustTier → TrustTier
  | a, b => if a.rank ≤ b.rank then a else b

/-! ## Headline theorem -/

/--
The intersect operation IS the rank-level minimum. This is the
headline property: the result's rank is exactly the minimum of the
two inputs' ranks. Combined with `intersect_le_left` and
`intersect_le_right`, this establishes that `intersect` is the
greatest lower bound on the rank ordering -- the lattice meet.

A caller who composes intersections (e.g. multi-hop ancestry walk)
can rely on this to reason about the final tier's rank as the
minimum across the chain, regardless of associativity or order of
intersection.
-/
theorem intersect_rank_eq_min (a b : TrustTier) :
    (a.intersect b).rank = min a.rank b.rank := by
  cases a <;> cases b <;> decide

/-! ## Lower-bound properties (result is at most as trusting as either input) -/

/--
The intersect result is no more trusted than the left argument.
Captures one half of "intersection only weakens, never widens" --
the safety property the runtime depends on at every multi-hop
ancestry step.
-/
theorem intersect_rank_le_left (a b : TrustTier) :
    (a.intersect b).rank ≤ a.rank := by
  cases a <;> cases b <;> decide

/--
The intersect result is no more trusted than the right argument.
The mirror of `intersect_rank_le_left`.
-/
theorem intersect_rank_le_right (a b : TrustTier) :
    (a.intersect b).rank ≤ b.rank := by
  cases a <;> cases b <;> decide

/-! ## Greatest-lower-bound property -/

/--
The intersect result is the GREATEST lower bound: any tier `t` that
is no more trusted than both inputs is also no more trusted than
the intersection. Combined with `intersect_rank_le_left` /
`intersect_rank_le_right`, this is the formal statement that
`intersect` is the lattice meet on the rank ordering.

Why this matters: if a future change accidentally made `intersect`
return something weaker than necessary (e.g. always `untrusted`), it
would still satisfy the two lower-bound theorems but FAIL this one --
the result would no longer be the greatest lower bound.
-/
theorem intersect_rank_is_glb (a b t : TrustTier)
    (ha : t.rank ≤ a.rank) (hb : t.rank ≤ b.rank) :
    t.rank ≤ (a.intersect b).rank := by
  -- Structured proof: rewrite via `intersect_rank_eq_min`, then apply
  -- the standard `Nat.le_min` lemma. Cleaner than a 125-case
  -- `simp_all` enumeration and explicitly shows the GLB property is
  -- a direct consequence of the rank-equals-min headline.
  rw [intersect_rank_eq_min]
  exact Nat.le_min.mpr ⟨ha, hb⟩

/-! ## Rank injectivity -/

/--
Rank uniquely determines tier: no two tiers share a rank. Useful
for lifting rank-level antisymmetry to identity-level equality.
-/
theorem rank_injective (a b : TrustTier) (h : a.rank = b.rank) : a = b := by
  cases a <;> cases b <;> simp_all [TrustTier.rank]

/-! ## Algebraic properties -/

/--
Intersect is idempotent: intersecting a tier with itself yields
that tier unchanged. (Trivial, but a useful sanity check that the
implementation doesn't silently weaken on self-intersect.)
-/
theorem intersect_idempotent (a : TrustTier) : a.intersect a = a := by
  cases a <;> decide

/--
Intersect commutes at both the rank and identity levels in this model.
Equal ranks identify the same constructor, so choosing the first argument
on a tie does not change the result. This theorem states rank commutativity.

Multi-hop ancestry composition relies on this: when intersecting a
chain of capabilities, the rank-level result is the minimum
regardless of which side is walked first.
-/
theorem intersect_rank_comm (a b : TrustTier) :
    (a.intersect b).rank = (b.intersect a).rank := by
  cases a <;> cases b <;> decide

/-! ## Monotonicity in each argument -/

/--
Intersect is monotone in its left argument at the rank level: if
`a₁` is no more trusted than `a₂`, then `intersect a₁ b` is no more
trusted than `intersect a₂ b`. Captures the "weakening a parent
weakens the result" half of multi-hop monotonicity.

This is the property a chain of delegations relies on: replacing
any ancestor in the chain with a lower-ranked one can only weaken
(never strengthen) the final result.
-/
theorem intersect_rank_monotone_left (a₁ a₂ b : TrustTier)
    (h : a₁.rank ≤ a₂.rank) :
    (a₁.intersect b).rank ≤ (a₂.intersect b).rank := by
  cases a₁ <;> cases a₂ <;> cases b <;> simp_all [TrustTier.rank, TrustTier.intersect]

/--
Intersect is monotone in its right argument at the rank level. The
mirror of `intersect_rank_monotone_left`.
-/
theorem intersect_rank_monotone_right (a b₁ b₂ : TrustTier)
    (h : b₁.rank ≤ b₂.rank) :
    (a.intersect b₁).rank ≤ (a.intersect b₂).rank := by
  cases a <;> cases b₁ <;> cases b₂ <;> simp_all [TrustTier.rank, TrustTier.intersect]

/-! ## Closed-set sanity -/

/--
The five-element TrustTier carrier is closed under intersect: there
are no "phantom" tiers the operation can produce. (Holds trivially
by the inductive type's totality, but stating it explicitly closes
the loop on "did we model the right type?" for a reviewer.)
-/
theorem intersect_closed (a b : TrustTier) :
    a.intersect b = .untrusted    ∨
    a.intersect b = .probationary ∨
    a.intersect b = .standard     ∨
    a.intersect b = .trusted      ∨
    a.intersect b = .verified := by
  cases a <;> cases b <;> decide

end TrustSurface.TrustTier
