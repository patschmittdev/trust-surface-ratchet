import test from "node:test";
import assert from "node:assert/strict";

import { SESSION_AUTHORITY_VALUES } from "../src/session-policy.mjs";

test("SESSION_AUTHORITY_VALUES is exhaustively pinned", () => {
  const EXPECTED = ["read", "write"];

  assert.deepEqual(
    [...SESSION_AUTHORITY_VALUES].sort(),
    [...EXPECTED].sort(),
    "SESSION_AUTHORITY_VALUES changed. Review the session authority boundary before accepting this list.",
  );
});
