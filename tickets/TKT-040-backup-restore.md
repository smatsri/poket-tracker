# TKT-040 — Verify a database restore

**Status:** done  
**Issue:** #40  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-038](TKT-038-first-cloud-deploy.md) (#38)

## Goal

A dump taken from the direct Neon URL can be restored into an empty database and checked through the API.

## Scope

- Document `pg_dump` in custom format against the direct connection string, and `pg_restore` into a fresh Neon branch or project.
- Store the dump outside Neon. Do not commit the dump.
- Run one restore. Check row counts for `players`, `sessions`, and `transactions`, and read one known session through the API.
- State that Neon Free instant restore is about six hours and is not the backup.

## Out of scope

- A scheduled dump job, a paid Neon plan, and a change to application features.
- Restoring over the production branch as the first attempt.

## Implementation notes

- Follow the recovery section of [docs/deployment.md](../docs/deployment.md).
- Use the direct URL. The pooled URL is for the running application.

## Acceptance criteria

- [x] The documented dump command uses the direct Neon URL and writes a file outside the repository.
- [x] A restore into a fresh branch or project reproduces the dumped players, sessions, and transactions.
- [x] One known session id read through the API matches the dumped session.
- [x] The dump file is not committed, and the production branch is not the restore target.
