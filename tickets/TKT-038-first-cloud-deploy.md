# TKT-038 — Deploy Cloud Run and Neon

**Status:** done  
**Issue:** #38  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-037](TKT-037-production-image.md) (#37)

## Goal

The operator can open the Cloud Run URL on a phone, sign in with the operator password, and use the existing application.

## Scope

- Create the Neon project in `aws-eu-central-1` and the Cloud Run service in `me-west1`.
- Use request-based billing, minimum instances `0`, maximum instances `2`, 1 vCPU, 512 MiB, and a 60 second timeout.
- Store the pooled URL, the direct URL, and `APP_PASSWORD` in Secret Manager. Mount them on the service. Grant the runtime service account access to those secrets only.
- Set a Google Cloud budget alert. Do not configure a probe that queries the database.
- Publish the image to Artifact Registry in `me-west1` and deploy it once by hand.
- Smoke-test health, player create, session submit, and an identical retry on a non-production Neon branch.
- Record the service URL and the region pair in [docs/deployment.md](../docs/deployment.md) only if a step differs from that document. Do not commit secret values.

## Out of scope

- GitHub Actions deployment. That is [TKT-039](TKT-039-github-actions-deploy.md).
- The restore drill. That is [TKT-040](TKT-040-backup-restore.md).
- A custom domain, a load balancer, and a minimum instance.

## Implementation notes

- Follow [docs/deployment.md](../docs/deployment.md). The Neon region cannot be changed after the project is created.
- The deploy identity must not need the secret values in the command line.

## Acceptance criteria

- [x] The public URL is the Cloud Run hostname in `me-west1`, and the database is the Neon project in `aws-eu-central-1`.
- [x] The service scales to zero and does not set a minimum instance.
- [x] A phone browser is prompted for the operator password before the application loads.
- [x] After signing in, creating a player and submitting a session works on a non-production branch.
- [x] `GET /health` does not require a password and does not query Neon.
- [x] A billing budget alert exists, and no secret value is committed.
