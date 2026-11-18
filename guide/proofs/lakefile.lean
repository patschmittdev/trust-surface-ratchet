import Lake
open Lake DSL

package proofs where
  -- Build settings for the trust-tier, permission, delegation, audit, and hash corpus.

@[default_target]
lean_lib Proofs where
  -- Root module imports the named proof modules under Proofs/.
  roots := #[`Proofs]
