# Generic ratchet fixture

This is a dependency-free example of the trust-surface ratchet. It deliberately uses generic names and is not coupled to an agent runtime.

The modeled boundary is `boundary-fields.json`. Its manifest records the SHA-256 of that file. Run:

```sh
node check
```

The check verifies that the boundary artifact exists and that its content hash matches the manifest. A byte change makes the check fail until the manifest is refreshed; the review itself is a human process.

To see the failure without modifying the fixture:

```sh
node demonstrate-regression
```

The demonstration copies the fixture to a temporary directory, adds `networkScope` to the boundary, and shows that the check fails before the temporary manifest is updated. This catches a trust-surface change even though no application behavior is being tested.

This is a teaching fixture, not a complete security control. A maintainer can still approve a hostile boundary and refresh the manifest. The ratchet makes the decision visible; it does not replace threat modeling or code review.
