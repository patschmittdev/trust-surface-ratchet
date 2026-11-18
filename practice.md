# The Trust Surface Ratchet practice

A review tripwire for closed security lists. The [reference gate](gate/)
is one mechanical check, not the practice itself.

## Origin

This practice was extracted from a private agent runtime by the same author. That is evidence of the author's motivation and first-party use only. Because it shares the same author and project lineage, it is not independent adoption or evidence that the practice generalizes, and readers cannot inspect it.

## Problem

Security decisions can live in finite lists: permission modes, host-only fields,
redaction categories, capability names, accepted algorithms, or audit event types.
A routine edit can change membership while functional tests stay green. Record
the current list in code and a pinned-list test to make selected changes visible
in review.

## Four ingredients

1. **Named boundary.** State what crosses the boundary and why it matters.
2. **Canonical closed export.** Represent the list as one importable closed
   value, such as a frozen array, frozen set, sealed enum, or language equivalent.
   A nearby comment names the threat or boundary concern.
3. **Pinned-list test.** Import the export and compare its complete contents
   with a literal expected list. Name the changed contract and review needed
   in the failure message.
4. **Contributor guidance.** Explain that list edits require classification
   and an explicit review decision.

The ratchet metaphor describes the review step: a list can widen or narrow,
but a pinned change fails until its expectation changes too. A person must
judge that update. This combines reified boundaries, TDD, defense in depth,
and threat-informed review; it is not a new security primitive.

A coverage gate complements these ingredients by flagging newly introduced
supported exports without a registered test or exemption. For fields used in
security-relevant hashes, partitions, or signatures, generated tests can probe
encoding ambiguity and collision risks. Such tests do not prove collision freedom.

## Adoption

1. Select one meaningful boundary with membership stable enough to pin.
2. Create its canonical export, threat-naming comment, and pinned-list test.
3. Register the export and test in the coverage manifest. Give narrow reasons
   for exempting supported exports with no trust consequence.
4. Run the pinned tests and gate locally and in CI. Explain the review rule
   near the code contributors edit.
5. Expand only when another list represents a real review decision.

Instructions provide context before an edit and remain advisory. Tests expose
changes to recorded lists. The gate exposes missing categorization and test
files that do not resemble pins. Repository policy determines whether checks
are required for merging; review determines whether the contract is acceptable.

## Practice and gate limits

The gate scans configured roots for [supported syntax](gate/README.md).
Its regular expressions are not a parser or general static-analysis framework.
It checks manifest membership and readable test-file shape, not test semantics.
Optional strict mode strengthens those heuristics; execution still requires
running the tests. Changes to discovery are themselves review decisions.

Neither the practice nor a passing gate establishes that:

- the boundary or threat enumeration is complete;
- every trust-bearing list was found or registered;
- classifications, exemptions, or expected values are safe;
- deep-equality syntax makes a test semantically exhaustive;
- consumers use the canonical export consistently;
- nested values are deeply immutable;
- runtime authorization, isolation, or data handling works;
- CI is required, correctly administered, or impossible to override;
- a maintainer will reject an unsafe update.

Behavioral bugs within a named surface, domain-specific secrets known only to
the embedding host, and model-to-implementation mismatches need separate checks.
A dishonest manifest update can move the tripwire past a hostile change.

The practice is local to a codebase and operates at edit time. It does not
extend into running processes, downstream services, or other repositories
without separate contracts and enforcement.

## Review

For every changed list, ask:

1. What data or authority changes across host-to-model, model-to-host, or
   worker-to-worker boundaries? Consider spoofing, tampering, repudiation,
   information disclosure, denial of service, and elevation of privilege.
2. Which consumers branch on or project each added or removed category?
3. Do the canonical export, expected list, and threat comment agree?
4. Which test exposes a membership change, and which gate exposes missing
   categorization?
5. If hashing or signing is involved, how does the encoding distinguish
   structured inputs that could collide when joined as strings?
6. Does a scan-root, syntax, path, exemption, or manifest change narrow coverage?

Record the rationale when a boundary widens. A passing check does not answer
these questions.

## Stopping conditions and related work

Ordinary constants, dynamic registries, and behavior-heavy policy need other
tests. Sealed types and exhaustive compiler checks may already cover the relevant
membership change. Stop if the team cannot maintain the manifest and expected
lists carefully. Extend discovery only for concrete patterns with failure-contract
tests and review.

Related approaches include the [Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/),
[ThreatSpec](https://threatspec.org/), [Threagile](https://github.com/Threagile/threagile),
[OWASP pytm](https://owasp.org/www-project-pytm/), architectural fitness functions,
[ArchUnit frozen rules](https://www.archunit.org/userguide/html/000_Index.html#_freezing_arch_rules),
approval tests, characterization tests, and policy as code. These provide context
for this synthesis rather than evidence of novelty or effectiveness.
