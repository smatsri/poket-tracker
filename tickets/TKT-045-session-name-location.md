# TKT-045 — Name and locate an evening

**Status:** done  
**Issue:** #46  
**Milestone:** M9 Evening usability  
**Depends on:** None

## Goal

Let an evening carry an optional name and location from the draft through history and the summary.

## Scope

- Add optional `name` and `location` to the session, each at most 80 characters after trim and internal-whitespace collapse. Omit an empty value.
- Edit both during the draft. Submit them with the existing session create. Return them on session reads.
- Keep a closed session's name, location, date, and transactions read-only.
- Leave stored sessions with no name and no location valid. They display the date and no location.
- Show the name on the history card and the summary, and show the date when the name is absent. Show the location on both when it is present.
- Add a PostgreSQL migration, OpenAPI fields, and the data-model description.
- Cover omitted fields, a custom name, and a read-only closed session with automated tests.

## Out of scope

- Renaming or relocating an evening after confirmation.
- A place directory, or tying the location to a player id.
- The history money metrics. That is TKT-046.

## Implementation notes

- Product decision 8 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- Use the player-name normalization for both fields.
- An identical retry includes the same name and location. A different name or location for an existing session id stays a `409`.
- Update [docs/data-model.md](../docs/data-model.md) and [docs/api/openapi.yaml](../docs/api/openapi.yaml) in this ticket.

## Acceptance criteria

- [x] A draft can save a name, a location, both, or neither, and a confirmed session returns the same values.
- [x] History and the summary show the name, or the date when the name is absent, and the location when it is set.
- [x] Existing sessions without the new fields still load and show the date.
- [x] A closed session has no control that changes its name, location, date, or transactions.
- [x] A retry with a different name or location for the same session id returns `409`.
- [x] Automated tests cover the omitted, named, and conflict cases.
