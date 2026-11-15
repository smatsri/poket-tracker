import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Transaction } from "../../domain/models.ts";
import {
  amountFieldProps,
  createActionChoices,
  createDraftAfterSave,
  createPlayerNet,
  draftFromTransaction,
  editedTransaction,
  emptyCreateDraft,
  emptyTransactionDraft,
  parsePositiveInteger,
  storedTypeForAction,
  validateCreateDraft,
  validateTransactionDraft,
} from "./transactionForm.ts";

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

test("create offers add and cash-out, and the first add is a buy-in", () => {
  assert.deepEqual(
    createActionChoices.map((choice) => choice.label),
    ["הוספת כסף", "יציאה"],
  );
  assert.equal(storedTypeForAction("add", "p1", []), "buy-in");
  assert.equal(storedTypeForAction("add", "p1", [{ playerId: "p1", type: "cash-out" }]), "buy-in");
  assert.equal(storedTypeForAction("add", "p1", [{ playerId: "p1", type: "buy-in" }]), "rebuy");
  assert.equal(storedTypeForAction("add", "p2", [{ playerId: "p1", type: "rebuy" }]), "buy-in");
  assert.equal(storedTypeForAction("add", "p1", [{ playerId: "p1", type: "rebuy" }]), "rebuy");
  assert.equal(storedTypeForAction("cash-out", "p1", []), "cash-out");

  const created = validateCreateDraft({ playerId: "p1", action: "add", amount: "50" }, []);
  assert.equal(created.ok, true);
  if (created.ok) {
    assert.equal(created.value.type, "buy-in");
    assert.equal("currency" in created.value, false);
  }
});

test("a new amount starts at the default and a save restores it without changing the saved amount", () => {
  assert.deepEqual(emptyCreateDraft("player-001", 50), { playerId: "player-001", action: null, amount: "50" });
  const next = createDraftAfterSave({ playerId: "player-001", action: "add", amount: "80" }, 50);
  assert.deepEqual(next, { playerId: "player-001", action: "add", amount: "50" });
  const saved: Transaction = {
    id: "tx-001",
    sessionId: "session-001",
    playerId: "player-001",
    type: "buy-in",
    amount: 80,
    timestamp: "2026-11-13T18:00:00Z",
  };
  assert.equal(saved.amount, 80);
  assert.equal(next.amount, "50");
});

test("a create row shows the evening net, or zero when the player has no transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "tx-001",
      sessionId: "session-001",
      playerId: "p1",
      type: "buy-in",
      amount: 50,
      timestamp: "2026-11-13T18:00:00Z",
    },
    {
      id: "tx-002",
      sessionId: "session-001",
      playerId: "p1",
      type: "cash-out",
      amount: 80,
      timestamp: "2026-11-13T19:00:00Z",
    },
  ];
  assert.equal(createPlayerNet("p1", transactions), 30);
  assert.equal(createPlayerNet("p2", transactions), 0);
});

test("the amount, action, and save stay outside the scrolling player list", () => {
  const source = readFileSync(new URL("./TransactionSheet.tsx", import.meta.url), "utf8");
  const scroll = source.indexOf("sheet-scroll");
  const actions = source.indexOf("sheet-actions");
  assert.ok(scroll >= 0 && actions > scroll);
  const footer = source.slice(actions);
  assert.match(footer, /createActionChoices/);
  assert.match(footer, /amount-field/);
  assert.match(footer, /שמירה/);
  const styles = readFileSync(new URL("../../styles/global.css", import.meta.url), "utf8");
  assert.match(styles, /\.sheet-scroll \{[^}]*overflow:\s*auto/s);
  assert.match(styles, /\.sheet \{[^}]*overflow:\s*hidden/s);
});

test("editing keeps the transaction id and timestamp", () => {
  const existing: Transaction = {
    id: "tx-001",
    sessionId: "session-001",
    playerId: "player-001",
    type: "buy-in",
    amount: 50,
    timestamp: "2026-11-13T18:00:00Z",
  };
  assert.deepEqual(draftFromTransaction(existing), { playerId: "player-001", type: "buy-in", amount: "50" });

  const ready = validateTransactionDraft({ playerId: "player-002", type: "cash-out", amount: "80" });
  assert.equal(ready.ok, true);
  if (!ready.ok) {
    return;
  }

  assert.deepEqual(editedTransaction(existing, ready.value), {
    id: "tx-001",
    sessionId: "session-001",
    playerId: "player-002",
    type: "cash-out",
    amount: 80,
    timestamp: "2026-11-13T18:00:00Z",
  });
});
