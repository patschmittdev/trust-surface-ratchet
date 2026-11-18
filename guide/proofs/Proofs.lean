-- Root module for the field guide's formal verification example.
--
-- This file is the entry point for `lake build`. It imports the
-- per-property submodules under `Proofs/`:
--
--   * Proofs.TrustTier    (Slice 2) -- trust-tier intersection lattice
--                                      meet + monotonicity properties
--   * Proofs.SingleHop    (Slice 3) -- single-hop capability-subset
--                                      soundness on a multi-axis
--                                      Capability record
--   * Proofs.MultiHop     (Slice 4) -- multi-hop monotonic transitive
--                                      restriction (the headline
--                                      property)
--   * Proofs.AuditChain   (Slice 5) -- constructed-chain properties and
--                                      per-record hash/signature injectivity
--                                      under named encoding and crypto axioms
--   * Proofs.CapabilityHash (Slice 6) -- capability-hash partition
--                                       correctness as a structural
--                                       reduction to two cryptographic
--                                       axioms (canonical-JSON
--                                       injective over the nine-axis
--                                       invariant, SHA-256
--                                       collision-resistant). Headline
--                                       theorem: distinct invariants have distinct hashes.
--                                       Runtime pool partitioning is not established.
--
-- See proofs/README.md for the modeling approach, what the proof
-- effort does and does NOT cover, and how a reviewer who has never
-- used Lean reads the resulting artifacts.

--
--
--
import Proofs.TrustTier
import Proofs.SingleHop
import Proofs.MultiHop
import Proofs.AuditChain
import Proofs.CapabilityHash
