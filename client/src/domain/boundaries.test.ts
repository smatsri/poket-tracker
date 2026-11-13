import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const domainDir = dirname(fileURLToPath(import.meta.url));

test("domain modules do not import React, IndexedDB, or the Fetch API", () => {
  const sources = readdirSync(domainDir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

  assert.ok(sources.length > 0);

  for (const name of sources) {
    const source = readFileSync(join(domainDir, name), "utf8");
    assert.equal(/\bfrom\s+["']react/.test(source), false, name);
    assert.equal(/\bindexedDB\b/.test(source), false, name);
    assert.equal(/\bfetch\s*\(/.test(source), false, name);
  }
});
