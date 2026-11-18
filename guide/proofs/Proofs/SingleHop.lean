-- Single-hop capability-subset soundness.
--
-- This module builds on the TrustTier lemmas to formalize the
-- "child cannot have a capability the parent did not have" property
-- across one delegation hop, on a multi-axis Capability record.
--
-- The implementation shape being modeled:
--
--     host code intersects trust tier and permission mode per axis,
--     then constructs the child job's effective capability envelope.
--
-- The Lean model abstracts both axes into a `Capability` record and
-- defines a single-hop restriction as the per-axis intersection.
-- Soundness = the result is no more permissive than EITHER input on
-- EVERY axis -- the formal statement of "no widening across a hop."
--
-- MultiHop.lean will compose singleHop transitively over an ancestor chain
-- and prove that N-hop monotonic restriction is the transitive
-- closure of single-hop soundness. The shape of this slice is chosen
-- to make that composition mechanical: every theorem here lifts
-- cleanly to the multi-hop fold.
--
-- Axes modeled:
--
--   * TrustTier      -- 5-tier capability lattice (TrustTier.lean)
--   * PermissionMode -- 2-element (safe < yolo); same meet semantics
--                       at the soundness level
--
-- These two axes are sufficient to demonstrate that the framework
-- extends beyond a single axis. A production envelope may have more
-- axes; adding them is mechanical and intentionally out of scope.

import Proofs.TrustTier

namespace TrustSurface.SingleHop

open TrustSurface.TrustTier

/-! ## PermissionMode -- second axis, same meet semantics -/

/--
Worker permission mode.
-/
inductive PermissionMode where
  | safe
  | yolo
  deriving DecidableEq, Repr

/--
Rank for permission mode. Higher = more permissive (yolo > safe).
-/
def PermissionMode.rank : PermissionMode → Nat
  | .safe => 0
  | .yolo => 1

/--
Permission-mode intersection: the more-restrictive of the two.
The JS path uses a hard refusal when child > parent (rather than
silent downgrade), but the safety property at the soundness level
is the same: the result's rank is at most either input's rank.
-/
def PermissionMode.intersect : PermissionMode → PermissionMode → PermissionMode
  | a, b => if a.rank ≤ b.rank then a else b

theorem PermissionMode.intersect_rank_eq_min (a b : PermissionMode) :
    (a.intersect b).rank = min a.rank b.rank := by
  cases a <;> cases b <;> decide

theorem PermissionMode.intersect_rank_le_left (a b : PermissionMode) :
    (a.intersect b).rank ≤ a.rank := by
  cases a <;> cases b <;> decide

theorem PermissionMode.intersect_rank_le_right (a b : PermissionMode) :
    (a.intersect b).rank ≤ b.rank := by
  cases a <;> cases b <;> decide

theorem PermissionMode.intersect_monotone_left (a₁ a₂ b : PermissionMode)
    (h : a₁.rank ≤ a₂.rank) :
    (a₁.intersect b).rank ≤ (a₂.intersect b).rank := by
  cases a₁ <;> cases a₂ <;> cases b <;> simp_all [PermissionMode.rank, PermissionMode.intersect]

theorem PermissionMode.intersect_monotone_right (a b₁ b₂ : PermissionMode)
    (h : b₁.rank ≤ b₂.rank) :
    (a.intersect b₁).rank ≤ (a.intersect b₂).rank := by
  cases a <;> cases b₁ <;> cases b₂ <;> simp_all [PermissionMode.rank, PermissionMode.intersect]

/--
GLB property for permission-mode intersection. Lifts the same
structured proof shape from `TrustTier.intersect_rank_is_glb`.
-/
theorem PermissionMode.intersect_rank_is_glb (a b t : PermissionMode)
    (ha : t.rank ≤ a.rank) (hb : t.rank ≤ b.rank) :
    t.rank ≤ (a.intersect b).rank := by
  rw [intersect_rank_eq_min]
  exact Nat.le_min.mpr ⟨ha, hb⟩

/--
Rank uniquely determines permission mode (no two modes share a rank).
Mirrors `TrustTier.rank_injective`.
-/
theorem PermissionMode.rank_injective (a b : PermissionMode) (h : a.rank = b.rank) : a = b := by
  cases a <;> cases b <;> simp_all [PermissionMode.rank]

/-! ## Capability record -- two axes -/

/--
A delegated capability envelope. Two axes are modeled (`tier`,
`mode`).

The product structure means soundness becomes "no widening on
ANY axis." Adding axes adds clauses to `Capability.le` and
`Capability.singleHop`; the headline theorems below are
robust to the addition because they're proved per-axis from the
TrustTier / PermissionMode lemmas above.
-/
structure Capability where
  tier : TrustTier
  mode : PermissionMode
  deriving DecidableEq, Repr

/--
Partial order on capabilities: `a ≤ b` iff `a` is no more
permissive than `b` on EVERY axis. The `∧` here is the
load-bearing piece -- if a future axis is added, this clause
extends naturally and the headline theorems below pick up the
new axis automatically once their per-axis lemma exists.
-/
def Capability.le (a b : Capability) : Prop :=
  a.tier.rank ≤ b.tier.rank ∧ a.mode.rank ≤ b.mode.rank

instance : LE Capability := ⟨Capability.le⟩

/--
Single delegation hop: applies the per-axis meet to produce the
child's effective capability. The child's REQUESTED capability is
`child`; the result is what the runtime actually grants after
intersecting with the parent's envelope.
-/
def Capability.singleHop (parent child : Capability) : Capability :=
  { tier := parent.tier.intersect child.tier
    mode := parent.mode.intersect child.mode }

/-! ## Headline theorems: single-hop soundness -/

/--
**Single-hop soundness (parent side).** The result of one
delegation hop is no more permissive than the parent on EVERY
axis. This is the formal statement of "a child cannot have a
capability the parent didn't have" -- the property the
multi-hop monotonic restriction reduces to via transitive
closure.
-/
theorem singleHop_le_parent (parent child : Capability) :
    (parent.singleHop child) ≤ parent := by
  refine ⟨?_, ?_⟩
  · exact intersect_rank_le_left parent.tier child.tier
  · exact PermissionMode.intersect_rank_le_left parent.mode child.mode

/--
**Single-hop soundness (child side).** The result is no more
permissive than the child requested. (Combined with
`singleHop_le_parent`, this establishes the result is the
greatest lower bound of the two -- the lattice meet.)

Operationally: a child that asks for less than its parent allows
gets what it asked for; a child that asks for more gets only what
the parent allows. Either way, never more than what was asked.
-/
theorem singleHop_le_child (parent child : Capability) :
    (parent.singleHop child) ≤ child := by
  refine ⟨?_, ?_⟩
  · exact intersect_rank_le_right parent.tier child.tier
  · exact PermissionMode.intersect_rank_le_right parent.mode child.mode

/-! ## Algebraic properties -/

/--
A single-hop delegation against oneself is the identity. (Trivial
sanity check that the implementation does not silently weaken on
self-hop.)
-/
theorem singleHop_self (cap : Capability) :
    cap.singleHop cap = cap := by
  cases cap with
  | mk tier mode =>
    cases tier <;> cases mode <;> decide

/-! ## Monotonicity -- foundation for the multi-hop fold (MultiHop.lean) -/

/--
Single-hop is monotone in the parent argument: weakening the
parent only weakens the result. This is the property the
multi-hop fold relies on -- replacing any ancestor in the chain
with a less-permissive one can only weaken (never strengthen) the
final result.
-/
theorem singleHop_monotone_parent (p₁ p₂ child : Capability) (h : p₁ ≤ p₂) :
    (p₁.singleHop child) ≤ (p₂.singleHop child) := by
  obtain ⟨h_tier, h_mode⟩ := h
  refine ⟨?_, ?_⟩
  · exact intersect_rank_monotone_left p₁.tier p₂.tier child.tier h_tier
  · exact PermissionMode.intersect_monotone_left p₁.mode p₂.mode child.mode h_mode

/--
Single-hop is monotone in the child argument: a less-permissive
child request produces a less-permissive result.
-/
theorem singleHop_monotone_child (parent c₁ c₂ : Capability) (h : c₁ ≤ c₂) :
    (parent.singleHop c₁) ≤ (parent.singleHop c₂) := by
  obtain ⟨h_tier, h_mode⟩ := h
  refine ⟨?_, ?_⟩
  · exact intersect_rank_monotone_right parent.tier c₁.tier c₂.tier h_tier
  · exact PermissionMode.intersect_monotone_right parent.mode c₁.mode c₂.mode h_mode

/-! ## Partial-order properties of `≤` on Capability -/

/--
Reflexivity of the capability ordering. Useful as a MultiHop.lean
hypothesis when reasoning about empty / single-element chains.
-/
theorem le_refl (cap : Capability) : cap ≤ cap := by
  refine ⟨?_, ?_⟩
  · exact Nat.le_refl _
  · exact Nat.le_refl _

/--
Transitivity of the capability ordering. THIS is the property
that makes the multi-hop fold composable in MultiHop.lean: if every
step weakens, the composition weakens.
-/
theorem le_trans (a b c : Capability) (hab : a ≤ b) (hbc : b ≤ c) : a ≤ c := by
  obtain ⟨h_tier_ab, h_mode_ab⟩ := hab
  obtain ⟨h_tier_bc, h_mode_bc⟩ := hbc
  refine ⟨?_, ?_⟩
  · exact Nat.le_trans h_tier_ab h_tier_bc
  · exact Nat.le_trans h_mode_ab h_mode_bc

/--
Antisymmetry of the capability ordering: if `a ≤ b` and `b ≤ a`,
then `a = b`. Combined with `le_refl` and `le_trans`, this gives the
full `PartialOrder` structure on `Capability`. The proof relies on
`TrustTier.rank_injective` and `PermissionMode.rank_injective`
(rank uniquely determines tier and mode), then uses standard
`Nat.le_antisymm` to lift the rank-level equality.
-/
theorem le_antisymm (a b : Capability) (hab : a ≤ b) (hba : b ≤ a) : a = b := by
  obtain ⟨h_tier_ab, h_mode_ab⟩ := hab
  obtain ⟨h_tier_ba, h_mode_ba⟩ := hba
  have h_tier : a.tier = b.tier :=
    TrustTier.rank_injective _ _ (Nat.le_antisymm h_tier_ab h_tier_ba)
  have h_mode : a.mode = b.mode :=
    PermissionMode.rank_injective _ _ (Nat.le_antisymm h_mode_ab h_mode_ba)
  cases a; cases b
  simp_all

/-! ## Greatest-lower-bound property at the Capability level -/

/--
The single-hop result IS the greatest lower bound on `Capability.le`:
any capability `t` that is `≤` both `parent` and `child` is also `≤`
the singleHop result. Lifts the per-axis GLB property to the
multi-axis structure.

This is the structural property that makes `singleHop` the lattice
meet on `Capability` -- the multi-hop fold in MultiHop.lean composes this
property transitively.
-/
theorem singleHop_is_glb (parent child t : Capability)
    (hp : t ≤ parent) (hc : t ≤ child) :
    t ≤ parent.singleHop child := by
  obtain ⟨h_tier_p, h_mode_p⟩ := hp
  obtain ⟨h_tier_c, h_mode_c⟩ := hc
  refine ⟨?_, ?_⟩
  · exact intersect_rank_is_glb parent.tier child.tier t.tier h_tier_p h_tier_c
  · exact PermissionMode.intersect_rank_is_glb parent.mode child.mode t.mode h_mode_p h_mode_c

end TrustSurface.SingleHop
