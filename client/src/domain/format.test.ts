import assert from "node:assert/strict";
import test from "node:test";
import { DomainValidationError } from "./errors.ts";
import { formatResult } from "./format.ts";

test("formats an integer result with he-IL grouping and an explicit sign", () => {
  assert.equal(formatResult(1234567), "+1,234,567");
  assert.equal(formatResult(-1234567), "\u22121,234,567");
  assert.equal(formatResult(0), "0");
  assert.equal(formatResult(-0), "0");
});

test("rejects a non-integer result", () => {
  assert.throws(
    () => formatResult(1.5),
    (error: unknown) => error instanceof DomainValidationError,
  );
});
