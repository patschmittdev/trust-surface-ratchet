# Changelog

## 0.1.0

### Added

- Trust Surface Ratchet practice, limits, and relationship to threat modeling and executable baselines.
- First-party reference use and same-author private runtime origin disclosure, without independent-adoption or effectiveness claims.
- Dependency-free JavaScript coverage gate with configuration, containment, discovery, artifact-shape, and CLI contracts.
- Adopter and permission-mode fixtures, configurable discovery helpers, and optional strict pin-shape validation (a non-executing heuristic).
- Field guide, community guidance, issue forms, and Linux and Windows CI on supported Node.js versions.
- Apache-2.0 licensing for code, scripts, and fixtures; CC BY 4.0 for guide prose and diagrams, with a file-class license map in NOTICE and guide/LICENSE.

### Security

- Coverage checks reject escaping, overlapping, unreadable, and symlinked configured paths; duplicate exports, stale registrations, duplicate categorization, and malformed test artifacts produce violations.
- Neutrality guard scans repository text and paths using a private environment list, required on non-fork pushes. Public pattern rules cover guide text outside guide/scripts. Configured lists withhold all matched values and matching paths unless local debugging explicitly enables values. Private hits cannot be allowlisted; unreadable entries fail closed.
