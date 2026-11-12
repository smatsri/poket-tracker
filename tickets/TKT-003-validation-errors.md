# TKT-003 — Add validation and the JSON error pipeline

**Status:** todo  
**Milestone:** M1 Server  
**Depends on:** [TKT-001](TKT-001-scaffold-workspaces.md)

## Goal

Provide one Zod-based validation path and one JSON error response for every API failure.

## Scope

- Add Zod.
- Define schemas that match [docs/api/openapi.yaml](../docs/api/openapi.yaml), including identifiers, calendar dates, RFC 3339 timestamps, transaction types, and positive integer amounts.
- Normalize a player name by trimming it and collapsing internal whitespace.
- Map validation failures to `400` and `VALIDATION_ERROR`.
- Map unexpected failures to `500` and `INTERNAL_ERROR`.
- Preserve `NOT_FOUND` and `CONFLICT` result types for the endpoint tickets to use.
- Reject JSON with unknown fields.

## Out of scope

- Player and session business operations.
- Returning field-level error arrays. Version 1 returns one `code` and one `message`.

## Implementation notes

- Accept timestamps only when they include `Z` or a numeric offset.
- Validate real calendar dates rather than relying only on the SQLite date pattern.
- Log unexpected failures on the server. Never place a stack trace, SQL statement, or driver message in the response.

## Acceptance criteria

- [ ] Invalid JSON, unknown fields, bad IDs, bad dates, and bad timestamps produce `400`.
- [ ] A timestamp without a timezone produces `400`.
- [ ] Amounts of `0`, negative numbers, and decimal numbers produce `400`.
- [ ] `"  Dana   Levi  "` normalizes to `"Dana Levi"`.
- [ ] A whitespace-only name fails validation.
- [ ] An unexpected thrown error returns `INTERNAL_ERROR` without internal details.
