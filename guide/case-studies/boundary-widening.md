# Case study: a green change that widened a boundary

This anonymized case study comes from applying the guide to the author's private agent runtime (see [practice.md, Origin](../../practice.md#origin)). Names and implementation identifiers are intentionally omitted; the point is the review pattern, not a product claim.

## The change

A worker snapshot already exposed a reviewed set of fields:

```text
taskId
permissionMode
workingDirectory
```

A contributor added `networkScope` to the snapshot so a downstream worker could make a more informed routing decision. The change was reasonable, the type declarations were updated, and the ordinary unit suite remained green.

## What ordinary tests missed

The existing tests checked that known fields were serialized correctly. They did not assert that the complete model-visible field set was unchanged. As a result, the new field crossed the host-to-worker boundary without an explicit trust-surface review.

This is the important limitation of behavior-only tests: they can confirm that existing behavior still works while missing that the set of authority-relevant data has grown.

## What the ratchet added

The boundary was represented by a closed artifact and a content-hashed manifest. CI checked that:

1. the artifact still existed;
2. the reviewed bytes had not changed;
3. a change to the artifact produced an actionable failure.

The same change now produces:

```text
RATCHET FAILED: boundary-fields.json changed
Review the boundary change, then refresh the manifest deliberately.
```

The failure does not declare the new field unsafe. It forces the contributor to answer the missing review questions:

- Is `networkScope` model-visible or host-only?
- What authority could it convey?
- Which threat comment describes the defense or limitation?
- Which exhaustive test covers it?
- Is the new field safe for every worker and delegation path?

## What the ratchet did not do

The gate did not discover the new field's meaning. It did not prove that the field was safe. It did not prevent a maintainer from approving the change and refreshing the manifest without thinking.

Its value was narrower and more defensible: it converted silent boundary growth into an explicit, reviewable event.

## Reproduce the mechanism

Run the generic fixture:

```sh
cd guide/examples/ratchet-fixture
node check
node demonstrate-regression
```

The first command verifies the reviewed baseline. The second copies the fixture, adds `networkScope`, and demonstrates that the unchanged manifest rejects the widening.

## Evidence boundary

This case study demonstrates a review mechanism, not a security certification. The fixture is intentionally small and not connected to a production implementation, and the result depends on the maintainer's threat analysis after the gate fires.
