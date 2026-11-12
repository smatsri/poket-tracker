import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";

const files = globSync("src/**/*.test.ts");
if (files.length === 0) {
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
