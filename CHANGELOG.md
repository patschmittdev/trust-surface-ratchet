# Changelog

Notable repository changes will be documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Hardened neutrality matching and withholding across repository text and paths.
  The newline- or comma-separated `NEUTRALITY_DENYLIST` remains private; non-fork
  pushes require it. Public rules remain guide-scoped, and only local debugging
  with `NEUTRALITY_SHOW_VALUES=true` reveals values.
- Added the file-class license map in `NOTICE` and `guide/LICENSE`.
- Curated the guide and consolidated practice, index, and proof documentation.
- Pinned the elan binary and expanded check coverage.
- Lean sources, scripts, and fixtures under guide/ are newly licensed Apache-2.0; previously no code license was specified.
- Corrected the proof count to 43 theorem declarations (AuditChain 7, CapabilityHash 2, MultiHop 8, SingleHop 16, TrustTier 10) and documented declared axioms.
- Labelled the simulation research EXPERIMENTAL.

### Added

- Added a proof-count guard test and community guidance.
- Included guide content and integrated guide checks and Lean proof CI.
- Added an adopter fixture and configurable discovery helpers.
- Added optional strict pin-shape validation; it remains a non-executing heuristic.

## [0.1.0] - 2026-09-11

### Added

- Defined the Trust Surface Ratchet practice, its limits, and its relationship
  to established threat-modeling and executable-baseline techniques.
- Documented the same-author private runtime origin in `practice.md` and first-party reference
  use, with an explicit boundary against independent-adoption or effectiveness
  claims.
- Added a dependency-free JavaScript coverage gate with explicit configuration,
  path-containment, discovery, artifact-shape, and CLI failure contracts.
- Added an imaginary permission-mode example with an exact-content test.
- Added structured issue forms for gate defects and practical experience,
  including decisions not to adopt the pattern.
- Added Linux and Windows CI coverage on supported Node.js versions.

### Security

- The coverage gate rejects escaping, overlapping, unreadable, and symlinked
  configured paths rather than treating an incomplete scan as clean.
- Duplicate exports, stale registrations, duplicate categorization, and
  malformed associated test artifacts produce explicit violations.
