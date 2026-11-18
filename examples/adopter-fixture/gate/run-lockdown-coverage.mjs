import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCli } from "../../../gate/check-lockdown-coverage.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strictPins = process.argv.includes("--strict");

process.exitCode = runCli({
  repoRoot,
  config: {
    scanRoots: ["src"],
    lockdownManifest: {
      SESSION_AUTHORITY_VALUES: "tests/session-policy.test.mjs",
    },
    nonLoadBearing: new Set(),
    strictPins,
  },
});
