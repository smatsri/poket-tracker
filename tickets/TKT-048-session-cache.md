# TKT-048 — Cache closed sessions for display

**Status:** todo  
**Issue:** #49  
**Milestone:** M9 Evening usability  
**Depends on:** [TKT-045](TKT-045-session-name-location.md) (#46)

## Goal

Open history and a summary from the last successful server response, then refresh from the server.

## Scope

- Store closed session documents in IndexedDB after a successful history or summary load.
- Render history and the summary from that cache immediately when it exists, then replace it with the successful server response.
- When the request fails and a cache exists, keep showing the cache and explain that the server could not be reached.
- When the request fails and no cache exists, keep the current recoverable error.
- Leave the active draft and pending evening in the existing active-session store. Do not treat the cache as a source for submit.
- Document the new store in the local-only section of the data model.
- Cover a warm cache, a refresh that replaces it, and a failed load with and without a cache.

## Out of scope

- Offline submit, offline player creation, and editing a cached session.
- Caching before name and location are part of the session document.

## Implementation notes

- Product decision 11 in [docs/roadmap-m9.md](../docs/roadmap-m9.md).
- The server remains the source of truth. A successful response wins over the cache.
- Update [docs/data-model.md](../docs/data-model.md) in this ticket. Do not add a sessions endpoint.

## Acceptance criteria

- [ ] Opening history with a warm cache shows the cached evenings before the network returns, then shows the server list after a successful load.
- [ ] Opening a cached summary does the same for that evening.
- [ ] A successful response replaces the cached document, including name and location.
- [ ] A failed load with a cache still shows the cached evenings and a Hebrew network notice.
- [ ] A failed load with an empty cache shows the existing error and retry.
- [ ] The cache is not used to submit or mutate an evening.
- [ ] Automated tests cover the warm cache, the replacement, and both failure cases.
