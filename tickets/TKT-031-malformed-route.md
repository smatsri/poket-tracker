# TKT-031 — Ignore a malformed history or statistics path

**Status:** todo  
**Issue:** #31  
**Milestone:** M7 Contract hardening  
**Depends on:** none

## Goal

An invalid percent-encoding in a history or statistics path does not crash the screen.

## Scope

- `parseHistoryLocation` and `parseStatsLocation` treat an invalid escape as the list location.
- Valid encoded ids still parse.
- Cover both parsers with automated tests.
- The new client row in [docs/testing.md](../docs/testing.md) passes.

## Out of scope

- Changing the screen used for a well-formed unknown path.
- Current-evening query parameters.

## Implementation notes

- An unrecognized history path already falls back to the list. A path such as `/history/%` must do the same instead of throwing.
- The same fallback applies to `/stats/%`.

## Acceptance criteria

- [ ] `/history/%` and `/stats/%` return the list location and do not throw.
- [ ] A valid encoded session id and player id still parse.
- [ ] `npm test` from the repository root passes.
