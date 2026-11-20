# TKT-054 — Add a note to the current evening

**Status:** done  
**Issue:** #56  
**Milestone:** M10 Follow-ups  
**Depends on:** None

## Goal

Let the operator attach one short note to the evening they are running.

## Scope

- Add an optional `note` on the session, at most 500 characters after the session-name trim and internal-whitespace collapse. Omit an empty value.
- Edit it on the draft, beside the name and location. Submit it with the session. Return it on session reads.
- Show the note on the summary when it is present. Keep it read-only after confirmation.
- Leave stored sessions with no note valid.
- Include the note in the identical-retry comparison. A different note for an existing session id returns `409`.
- Add a PostgreSQL migration, the OpenAPI field, and the data-model description.
- Cover an omitted note, a saved note, a too-long note, and a conflicting retry with automated tests.

## Out of scope

- Showing the note on the history card.
- Adding, editing, or deleting the note after the evening is closed.
- More than one note, a title on the note, linked players, photos, or the poker-night journal.
- Archive and delete. That is TKT-055.

## Implementation notes

- Product decision 6 in [docs/roadmap-m10.md](../docs/roadmap-m10.md).
- Follow the name and location path: draft field, submit body, read model, summary display.
- Update [docs/data-model.md](../docs/data-model.md) and [docs/api/openapi.yaml](../docs/api/openapi.yaml) in this ticket.

## Acceptance criteria

- [x] A draft can save a note or leave it empty, and a confirmed session returns the same value.
- [x] A note longer than 500 characters after normalization is rejected, and an empty note is omitted.
- [x] The summary shows the note. A closed evening has no control that changes it.
- [x] Existing sessions without a note still load.
- [x] An identical retry returns the stored note. A different note for the same session id returns `409`.
- [x] Automated tests cover the omitted, saved, rejected, and conflict cases.
