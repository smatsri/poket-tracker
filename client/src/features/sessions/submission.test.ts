import assert from "node:assert/strict";
import test from "node:test";
import { ApiRequestError } from "../../data/api/errors.ts";
import type { ActiveSessionRecord, Transaction } from "../../domain/models.ts";
import { classifySubmissionFailure, submissionActions, submissionMessages } from "./submission.ts";

function record(status: ActiveSessionRecord["status"], transactions: Transaction[]): ActiveSessionRecord {
  return {
    status,
    updatedAt: "2026-11-13T22:00:00Z",
    session: {
      id: "session-1",
      date: "2026-11-13",
      createdAt: "2026-11-13T18:00:00Z",
      transactions,
    },
  };
}

const transaction: Transaction = {
  id: "t1",
  sessionId: "session-1",
  playerId: "p1",
  type: "buy-in",
  amount: 50,
  timestamp: "2026-11-13T18:00:00Z",
};

test("a draft with no transactions cannot be submitted", () => {
  const actions = submissionActions(record("draft", []));
  assert.equal(actions.canFinish, false);
  assert.equal(actions.canRetry, false);
  assert.equal(actions.canMutate, true);
  assert.equal(actions.canStartAnother, false);
});

test("a draft with transactions can be finished and a pending evening cannot start another", () => {
  const draft = submissionActions(record("draft", [transaction]));
  assert.equal(draft.canFinish, true);
  assert.equal(draft.canMutate, true);
  assert.equal(draft.canStartAnother, false);

  const pending = submissionActions(record("pending", [transaction]));
  assert.equal(pending.canFinish, false);
  assert.equal(pending.canRetry, true);
  assert.equal(pending.canMutate, false);
  assert.equal(pending.canStartAnother, false);
});

test("a submitted evening is read-only and can start another evening", () => {
  const actions = submissionActions(record("submitted", [transaction]));
  assert.equal(actions.canFinish, false);
  assert.equal(actions.canRetry, false);
  assert.equal(actions.canMutate, false);
  assert.equal(actions.canStartAnother, true);
});

test("a conflict keeps a distinct explanation and other failures stay retryable", () => {
  assert.equal(classifySubmissionFailure(new ApiRequestError("different content", 409, "CONFLICT", "http")), "conflict");
  assert.equal(classifySubmissionFailure(new ApiRequestError("down", 500, "INTERNAL_ERROR", "http")), "retryable");
  assert.equal(classifySubmissionFailure(new ApiRequestError("offline", null, null, "network")), "retryable");
  assert.match(submissionMessages.conflict, /תוכן אחר/);
  assert.match(submissionMessages.retryable, /נשמרו/);
});
