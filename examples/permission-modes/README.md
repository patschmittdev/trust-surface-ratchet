# Permission modes example

This imaginary example shows the executable core of the practice:

1. [a frozen category export](lib/permission-modes.mjs);
2. [a pinned-list test](tests/permission-modes.test.mjs) with an explicit
   expected list; and
3. [the reference gate](../../gate/check-lockdown-coverage.mjs), configured
   to discover and categorize the export.

It does not demonstrate a complete threat model or path-scoped contributor
instructions. See [practice.md](../../practice.md) for all four ingredients.

The permission modes are the reified boundary, and the pinned-list test is
the ratchet tooth. Changing the boundary's membership makes the recorded
expectation fail until a reviewer can consider the paired update.

## What each check observes

`PERMISSION_MODE_VALUES` is a frozen array for the modes understood by an
imaginary service. The pinned-list test imports it and compares all values
with `["safe", "operator"]`.

If a contributor adds a mode to the existing array, the test fails until
the expected list is deliberately updated:

```text
PERMISSION_MODE_VALUES changed.
```

If a contributor adds a separate supported frozen export under the scan
root, the standalone gate reports it as `uncategorized` until it is added
to the manifest or exemption set.

These are different checks. The gate does not inspect the expected list or
decide whether a permission mode is safe.

Run both from the repository root:

```sh
npm test
npm run check:lockdowns
```

On the committed example, both exit successfully. To inspect the negative
behavior, make a temporary local edit, run the commands, and restore the
file manually before committing.

## Adapting the example

1. Choose a finite list whose exact membership affects a named trust
   boundary.
2. Make one closed export canonical for consumers.
3. Add a nearby comment describing the concrete boundary concern.
4. Write a pinned-list test that compares the full current contents with a
   literal expectation and gives an actionable failure message.
5. Register the export and test path in the gate.
6. Run the test and gate in CI.
7. Require human review of expected-list changes.

The remaining decision is the important one: a reviewer must determine
whether each value and each consumer are appropriate. Passing this example
does not make that determination.
