-- Multi-hop monotonic transitive restriction.
--
-- This module composes single-hop soundness transitively over an
-- ancestor chain and proves that the final effective capability is
-- no more permissive than ANY ancestor in the chain.
--
-- This is the formal statement of a property commonly spot-checked
-- via property-based sampling. The Lean kernel verifies it for ALL
-- chains of ALL lengths, not just hand-picked or randomly-generated
-- examples.
--
-- The implementation shape being modeled:
--
--     host code walks a parent chain and intersects the capability
--     envelope per axis at every step. The final envelope is what the
--     child job receives.
--
-- The Lean model abstracts this as a left-fold of singleHop over a
-- List Capability ancestor chain. The chain-length cap is NOT
-- modeled here (the theorems hold for chains of any length); the
-- ancestry-depth bounds are operational refusals in implementations,
-- not soundness properties of the lattice model.
--
-- Headline theorems:
--
--   * multiHop_le_root          -- result ≤ root parent
--   * multiHop_le_member        -- result ≤ EVERY chain member
--   * multiHop_self_chain       -- chain of N self-hops is identity
--   * multiHop_extend           -- inductive structure: extending
--                                  the chain by one is one more
--                                  singleHop (used by the proofs
--                                  above)
--   * multiHop_monotone_root    -- weakening the root weakens the
--                                  multi-hop result
--
-- The headline property -- "child's effective capability is bounded
-- by the LEAST permissive ancestor" -- follows immediately from
-- multiHop_le_member: since the result is ≤ every chain member, it
-- is in particular ≤ the least permissive one.

import Proofs.SingleHop

namespace TrustSurface.MultiHop

open TrustSurface.SingleHop

/--
Multi-hop delegation: fold single-hop restriction across an
ancestor chain. The `root` argument is the topmost parent in the
chain; the `chain` list contains the requested child capabilities
in delegation order (oldest child first, current leaf last).

If `chain = []`, the result is just `root` -- no restriction
applied. If `chain = [c1, c2, c3]`, the result is
`root.singleHop c1 |>.singleHop c2 |>.singleHop c3` -- each step
restricts the running envelope.
-/
def multiHop (root : Capability) (chain : List Capability) : Capability :=
  chain.foldl Capability.singleHop root

/-! ## Inductive structure -/

/--
Extending the chain by one element on the RIGHT (the new leaf) is
the same as taking one more single-hop on the existing result.
This is the recursive structure the headline theorems induct on.

In other words, "delegating one more level" = "apply singleHop one
more time" -- which is the operational guarantee SingleHop.lean already
proved sound at each step.
-/
theorem multiHop_extend (root : Capability) (chain : List Capability) (c : Capability) :
    multiHop root (chain ++ [c]) = (multiHop root chain).singleHop c := by
  simp [multiHop, List.foldl_append]

/-! ## Headline soundness theorems -/

/--
**Multi-hop result is no more permissive than the root.** No matter
how long the chain or what the intermediate children requested,
the final effective capability is bounded above by the root
parent's capability.

This is the multi-hop analogue of `singleHop_le_parent`: just as
one hop cannot widen the parent, N hops cannot widen the root.
-/
theorem multiHop_le_root (root : Capability) (chain : List Capability) :
    multiHop root chain ≤ root := by
  induction chain generalizing root with
  | nil =>
    -- multiHop root [] = root, so the goal is root ≤ root
    exact le_refl root
  | cons head tail ih =>
    -- multiHop root (head :: tail) = multiHop (root.singleHop head) tail
    -- By IH applied to (root.singleHop head): the result ≤ root.singleHop head.
    -- By singleHop_le_parent: root.singleHop head ≤ root.
    -- By transitivity: result ≤ root.
    have h1 : multiHop (root.singleHop head) tail ≤ root.singleHop head :=
      ih (root.singleHop head)
    have h2 : root.singleHop head ≤ root := singleHop_le_parent root head
    exact le_trans _ _ _ h1 h2

/--
**HEADLINE: multi-hop result is no more permissive than ANY chain
member.** For every capability `c` that appears anywhere in the
ancestor chain, the final effective capability is bounded above by
`c`.

This is the formal statement of the multi-hop monotonic restriction
property. The Lean kernel verifies it for all chains of all lengths,
mechanically.

Combined with `multiHop_le_root`, this means: the final effective
capability is no more permissive than the LEAST permissive
ancestor in the chain -- the "no link in the chain can be widened
by a later link" property the trust boundary depends on.
-/
theorem multiHop_le_member (root : Capability) (chain : List Capability)
    (c : Capability) (h : c ∈ chain) : multiHop root chain ≤ c := by
  induction chain generalizing root with
  | nil =>
    -- `c ∈ []` is impossible
    exact absurd h (List.not_mem_nil c)
  | cons head tail ih =>
    rcases List.mem_cons.mp h with rfl | h_tail
    · -- After `rfl`: `head` was substituted away; the goal is now
      --   multiHop root (c :: tail) ≤ c.
      -- multiHop unfolds to multiHop (root.singleHop c) tail.
      -- By multiHop_le_root applied to the smaller chain:
      --   result ≤ root.singleHop c.
      -- By singleHop_le_child: root.singleHop c ≤ c.
      -- Transitivity: result ≤ c.
      have h1 := multiHop_le_root (root.singleHop c) tail
      have h2 := singleHop_le_child root c
      exact le_trans _ _ _ h1 h2
    · -- c ∈ tail: apply IH with the new running root.
      exact ih (root.singleHop head) h_tail

/-! ## Identity / degenerate cases -/

/--
A chain consisting entirely of copies of the root capability is
the identity on the root. (Sanity check: self-hops do not silently
weaken the running envelope across many steps.)
-/
theorem multiHop_self_chain (root : Capability) (n : Nat) :
    multiHop root (List.replicate n root) = root := by
  induction n with
  | zero =>
    -- multiHop root [] = root
    rfl
  | succ k ih =>
    -- List.replicate (k+1) root = root :: List.replicate k root
    -- multiHop root (root :: rest) = multiHop (root.singleHop root) rest
    --                              = multiHop root rest    (by singleHop_self)
    --                              = root                  (by IH)
    simp only [List.replicate, multiHop, List.foldl_cons]
    rw [singleHop_self]
    -- Now the goal is: List.foldl Capability.singleHop root (List.replicate k root) = root.
    -- This equals multiHop root (List.replicate k root); apply IH.
    exact ih

/-! ## Monotonicity at the chain level -/

/--
Weakening the root parent weakens the entire multi-hop result.
The chain-level analogue of `singleHop_monotone_parent`. Captures
the property that a less-permissive root cannot somehow grant a
MORE-permissive leaf via the intermediate chain.
-/
theorem multiHop_monotone_root (r₁ r₂ : Capability) (chain : List Capability)
    (h : r₁ ≤ r₂) : multiHop r₁ chain ≤ multiHop r₂ chain := by
  induction chain generalizing r₁ r₂ with
  | nil =>
    -- multiHop r [] = r, so the goal is r₁ ≤ r₂, which is h.
    exact h
  | cons head _tail ih =>
    -- multiHop r (head :: tail) = multiHop (r.singleHop head) tail
    -- By singleHop_monotone_parent: r₁.singleHop head ≤ r₂.singleHop head.
    -- By IH: multiHop (r₁.singleHop head) tail ≤ multiHop (r₂.singleHop head) tail.
    apply ih
    exact singleHop_monotone_parent r₁ r₂ head h

/-! ## GLB sharpening of the headline property -/

/--
The multi-hop fold result IS the greatest lower bound of the root
and the chain on `Capability.le`. Sharpens `multiHop_le_member` from
"≤ every chain member" to "is the GLB of the root and every chain
member."

Operational reading: a capability `t` that is no more permissive
than the root AND no more permissive than every requested child in
the chain is also no more permissive than the final effective
capability. Combined with `multiHop_le_root` and
`multiHop_le_member`, this establishes that `multiHop` produces the
maximally-restrictive intersection across the chain -- not just an
upper bound that happens to be `≤` every link.

Why the sharpening matters: a buggy implementation that returns
`untrusted` everywhere would satisfy `multiHop_le_root` and
`multiHop_le_member` but FAIL this theorem (the result would be
strictly more restrictive than the GLB). The GLB statement closes
the "always returns minimum" failure mode at the chain level.
-/
theorem multiHop_is_glb_of_chain (root : Capability) (chain : List Capability)
    (t : Capability) (h_root : t ≤ root)
    (h_chain : ∀ c, c ∈ chain → t ≤ c) :
    t ≤ multiHop root chain := by
  induction chain generalizing root with
  | nil =>
    -- multiHop root [] = root; need t ≤ root which is h_root.
    exact h_root
  | cons head tail ih =>
    -- multiHop root (head :: tail) = multiHop (root.singleHop head) tail.
    -- IH wants: t ≤ root.singleHop head AND ∀ c ∈ tail, t ≤ c.
    apply ih
    · -- t ≤ root.singleHop head, by per-axis GLB at the Capability level.
      have h_head : t ≤ head := h_chain head (List.mem_cons_self _ _)
      exact singleHop_is_glb root head t h_root h_head
    · -- ∀ c ∈ tail, t ≤ c (subset of the cons-list hypothesis).
      intro c hc
      exact h_chain c (List.mem_cons.mpr (Or.inr hc))

/-! ## Operational refusal cap -/

/--
The modeled runtime has a fixed maximum ancestry depth.
This is an operational refusal cap. The
runtime refuses to construct a child whose ancestry chain would
exceed this depth (operational refusal, not a soundness property).

The proofs above hold for chains of ARBITRARY length; this constant
is named here for completeness so a reviewer can confirm the
operational cap is captured in the model even though it is not
load-bearing for the headline `multiHop_le_member` theorem.
-/
def MAX_ANCESTRY_DEPTH : Nat := 32

/--
Sanity check: the cap is positive. A zero-depth cap would refuse
all delegation, which is not the runtime's intent.
-/
theorem max_ancestry_depth_positive : MAX_ANCESTRY_DEPTH > 0 := by decide

/--
Headline `multiHop_le_member` restricted to bounded chains. Holds
trivially because the headline holds for arbitrary chains; we
restate it under the bound to document that the operational refusal
cap is consistent with the verified property.
-/
theorem multiHop_le_member_bounded (root : Capability) (chain : List Capability)
    (_h_bound : chain.length ≤ MAX_ANCESTRY_DEPTH)
    (c : Capability) (h_mem : c ∈ chain) :
    multiHop root chain ≤ c :=
  multiHop_le_member root chain c h_mem

end TrustSurface.MultiHop
