# TKT-037 — Build the production container image

**Status:** done  
**Issue:** #37  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-033](TKT-033-postgresql-access.md) (#33), [TKT-035](TKT-035-production-http-host.md) (#35), [TKT-036](TKT-036-operator-basic-auth.md) (#36)

## Goal

One Node 22 image can run the production server without a local database file or a native SQLite module.

## Scope

- Add a multi-stage Dockerfile and a `.dockerignore`.
- Build the client and the server in the image. The runtime stage contains production dependencies, the compiled server, and `client/dist`.
- Start with `node` on the compiled server. Do not include `tsx`, `server/data`, or `better-sqlite3`.
- Document the local `docker run` command, including `PORT`, `DATABASE_URL`, and `APP_PASSWORD`.

## Out of scope

- Pushing the image to Artifact Registry or creating cloud resources. That is [TKT-038](TKT-038-first-cloud-deploy.md).
- Changing application behavior beyond what TKT-033, TKT-035, and TKT-036 already require.

## Implementation notes

- Follow the delivery section of [docs/deployment.md](../docs/deployment.md).
- The image listens on the platform `PORT` and `0.0.0.0`.

## Acceptance criteria

- [x] `docker build` produces an image that starts with `node` on the compiled server.
- [x] The runtime image does not contain `better-sqlite3` or a SQLite database file.
- [x] With `DATABASE_URL` and `APP_PASSWORD` set, the container serves `/health` and requires Basic Auth for `/`.
- [x] A missing `APP_PASSWORD` in production mode prevents the container from staying up.
