// Pinned-list test for PERMISSION_MODE_VALUES.
//
// Pins the exact current contents of the example export. A failure exposes
// a boundary change for review; it does not decide whether the change is safe.

import test from "node:test";
import assert from "node:assert/strict";

import { PERMISSION_MODE_VALUES } from "../lib/permission-modes.mjs";

test("PERMISSION_MODE_VALUES is exhaustively pinned", () => {
  // The expected set. If this assertion fails, the runtime's
  // permission-mode trust surface has changed.
  const EXPECTED = ["safe", "operator"];

  assert.deepEqual(
    [...PERMISSION_MODE_VALUES].sort(),
    [...EXPECTED].sort(),
    "PERMISSION_MODE_VALUES changed. If this change is intentional:\n" +
      "  1. Update EXPECTED in examples/permission-modes/tests/permission-modes.test.mjs.\n" +
      "  2. Update the threat-naming comment in examples/permission-modes/lib/permission-modes.mjs\n" +
      "     to describe what the new value lets cross the trust boundary.\n" +
      "  3. Review every consumer that branches on permission mode (in your real adopter\n" +
      "     repo, this would be your policy engine, your worker spawner, your audit sink,\n" +
      "     and any tier mapper).\n" +
      "  4. Confirm the gate at gate/check-lockdown-coverage.mjs still has\n" +
      "     PERMISSION_MODE_VALUES in LOCKDOWN_MANIFEST pointing here.\n" +
      "If this change is NOT intentional, revert lib/permission-modes.mjs.",
  );
});

test("PERMISSION_MODE_VALUES is genuinely frozen", () => {
  // Prevents a careless callsite from mutating this top-level array.
  // It is not a security boundary against code executing in-process.
  assert.throws(
    () => {
      PERMISSION_MODE_VALUES.push("backdoor");
    },
    TypeError,
    "PERMISSION_MODE_VALUES must be frozen so this top-level array rejects mutation.",
  );
});
