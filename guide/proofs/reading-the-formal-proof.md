# Reading the formal proof

Lean files declare types, functions, and theorems. Proofs that compile without
`sorry` are kernel-checked, conditional on the declared axioms listed with
[file and line locations](README.md). This standalone model is not bound to the
gate's code.

Example:

```lean
theorem intersect_rank_eq_min (a b : TrustTier) :
    (a.intersect b).rank = min a.rank b.rank := by
  cases a <;> cases b <;> decide
```

What it means:

> For any two modeled trust tiers, the rank of their intersection is exactly the minimum rank of
> the two inputs.

What the proof does:

1. `cases a <;> cases b` enumerates every pair of trust-tier constructors.
2. `decide` asks Lean to compute and verify each finite case.

## Reviewer protocol

1. Read the theorem statement before the proof tactic.
2. Check whether the modeled types include the cases you care about.
3. Run `lake build`.
4. Search for `sorry`.
5. Treat any implementation mapping as a separate evidence question.

The proof is strongest where the model is faithful and the property is fully stated. It says
nothing about implementation behavior outside the model.

