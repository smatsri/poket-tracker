# TKT-039 — Deploy from GitHub Actions

**Status:** done  
**Issue:** #39  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-034](TKT-034-concurrent-session-submit.md) (#34), [TKT-037](TKT-037-production-image.md) (#37), [TKT-038](TKT-038-first-cloud-deploy.md) (#38)

## Goal

A push to `main` tests the server against Postgres, publishes the image, and deploys it to the existing Cloud Run service.

## Scope

- Add a workflow that runs the test suite against an empty Postgres service container, builds the image, pushes it to Artifact Registry in `me-west1`, and deploys that image.
- Authenticate to Google Cloud with Workload Identity Federation.
- Reuse the Cloud Run service and secrets from [TKT-038](TKT-038-first-cloud-deploy.md). Do not put `DATABASE_URL` or `APP_PASSWORD` in GitHub.
- Keep the manual Neon smoke out of this workflow.

## Out of scope

- Creating the Neon project, the first service, or the secrets.
- A database migration job that connects to the production branch from GitHub.

## Implementation notes

- Follow the delivery and tests sections of [docs/deployment.md](../docs/deployment.md).
- The workflow deploys the image built in that run. It does not deploy a locally built image.

## Acceptance criteria

- [x] A push to `main` fails the workflow when the Postgres test suite fails, and does not deploy that image.
- [x] A green push publishes an image to Artifact Registry in `me-west1` and deploys it to the existing Cloud Run service.
- [x] The workflow logs and GitHub secrets do not contain the database URLs or the operator password.
- [x] The deployed service still requires the operator password and still serves `/health` without one.
