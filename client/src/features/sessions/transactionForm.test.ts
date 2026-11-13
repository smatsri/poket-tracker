import assert from "node:assert/strict";
import test from "node:test";
import { amountFieldProps, draftAfterSave, emptyTransactionDraft, parsePositiveInteger, validateTransactionDraft } from "./transactionForm.ts";

test("the amount field asks a mobile browser for a numeric keyboard", () => {
  assert.equal(amountFieldProps.inputMode, "numeric");
  assert.equal(amountFieldProps.pattern, "[0-9]*");
});

test("a transaction is ready only with a player, a type, and a positive integer", () => {
  const missing = validateTransactionDraft(emptyTransactionDraft());
  assert.equal(missing.ok, false);
  if (missing.ok) {
    return;
  }
  assert.equal(missing.errors.player, "צריך לבחור שחקן.");
  assert.equal(missing.errors.type, "צריך לבחור סוג פעולה.");
  assert.equal(missing.errors.amount, "צריך להזין סכום.");

  const ready = validateTransactionDraft({ playerId: "player-001", type: "buy-in", amount: " 50 " });
  assert.equal(ready.ok, true);
  if (!ready.ok) {
    return;
  }
  assert.deepEqual(ready.value, { playerId: "player-001", type: "buy-in", amount: 50 });
});

test("decimals and other non-integers are rejected instead of rounded", () => {
  for (const amount of ["10.5", "10,5", "0", "-1", "01", "1e2", "50.0", "abc"]) {
    assert.equal(parsePositiveInteger(amount), null);
    const result = validateTransactionDraft({ playerId: "player-001", type: "rebuy", amount });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.amount, "הסכום צריך להיות מספר שלם וחיובי.");
      assert.equal(result.errors.player, undefined);
    }
  }
});

test("a successful save keeps the player and type and clears the amount", () => {
  const next = draftAfterSave({ playerId: "player-001", type: "cash-out", amount: "80" });
  assert.deepEqual(next, { playerId: "player-001", type: "cash-out", amount: "" });
});
