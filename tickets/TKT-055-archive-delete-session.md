# TKT-055 — Archive or delete a closed evening

**Status:** todo  
**Issue:** #57  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Let the operator hide a closed evening from the recap, or remove it.

## Scope

- Archive sets server-owned `archivedAt`. Restore clears it. Both are idempotent and return the session.
- `GET /api/sessions` omits archived evenings. `GET /api/sessions?archived=true` returns only archived evenings. `GET /api/sessions/{sessionId}` still returns an archived evening.
- Delete removes the session and its transactions, returns `204`, and a second delete returns `404`. A later submit of that id stores a new session and returns `201`.
- An identical submit does not change `archivedAt`. A different body for an existing id still returns `409`.
- Keep name, location, date, note, and transactions uneditable. Archive, restore, and delete are the only closed-evening mutations.
- On the default history list, offer archive and delete. Offer a separate archived list that can restore or delete. Ask for confirmation before delete.
- Exclude archived evenings from statistics and charts.
- Replace the closed-session cache only from a non-archived history response. Do not replace it from the archived list. Update that cache when an evening is archived, restored, or deleted.
- Add a migration, OpenAPI operations, and the data-model description. Replace architecture decision 7.
- Cover archive, restore, delete, the filtered list, statistics, and the cache with automated tests.

## Out of scope

- Editing a closed evening's name, location, date, note, or transactions.
- Archiving or deleting the local draft before it is submitted.
- Bulk archive, and merging two evenings.

## Implementation notes

- Product decision 7 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- `archivedAt` is not part of the client submit body. Treat it like `createdAt` in the retry comparison.
- Hebrew labels: `העברה לארכיון`, `שחזור`, `מחיקה`, and `ערבים בארכיון`. The delete confirmation names the evening and states that the evening and its actions will be removed.
- This replaces the deferred rule that a confirmed session cannot be deleted. Editing its contents stays deferred.

## Acceptance criteria

- [ ] Archiving an evening hides it from the default history and from statistics, and the archived list shows it.
- [ ] Restoring an archived evening returns it to the default history and to statistics.
- [ ] Archiving or restoring an evening that is already in that state returns the stored session and does not duplicate rows.
- [ ] Delete removes the evening and its transactions. A second delete returns `404`. Submitting that id again stores a new session.
- [ ] An identical retry of an archived evening stays archived.
- [ ] A closed evening still has no control that edits its name, location, date, note, or transactions.
- [ ] Delete asks for confirmation. Archive and restore do not.
- [ ] The default history cache keeps non-archived evenings across an archived-list load, and drops or restores an evening when that action succeeds.
- [ ] Automated tests cover the API, the statistics exclusion, and the cache.
