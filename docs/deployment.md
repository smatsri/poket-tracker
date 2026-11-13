# Deployment

Production hosting for Poker Tracker. Product behavior stays in [architecture.md](architecture.md), [data-model.md](data-model.md), and [api/openapi.yaml](api/openapi.yaml). This document locks the hosting decisions. Implementation tickets cite it; they do not reopen it.

Operator access here is one shared password in front of the existing application. Player accounts remain deferred.

## Topology

One Cloud Run service in `me-west1` (Tel Aviv) runs the Express process. That process serves the Vite production build and the existing `/api` routes. Neon PostgreSQL in `aws-eu-central-1` (Frankfurt) is the only durable store. The container filesystem is not a database.

```text
Mobile browser
      |
      | HTTPS
      v
Cloud Run (me-west1)
      |
      +-- React static files
      |
      +-- Express /api
                |
                | TLS, pooled connection
                v
           Neon (aws-eu-central-1)
```

Neon has no region in Israel or on Google Cloud. New projects cannot be created in Neon’s Azure regions. Frankfurt is the closest AWS region Neon offers. The Neon region is fixed when the project is created.

Cloud Run stays in Tel Aviv. Moving it to Frankfurt would still cross from Google Cloud to AWS on the public internet, and it would put the page and font bytes on the longer path to a phone in Israel. SQL payloads are small. The first request of an evening also waits for Neon to resume.

Public URL is the Cloud Run `run.app` hostname. A custom domain is not part of this deployment.

## Runtime

- Request-based billing, minimum instances `0`, maximum instances `2`, 1 vCPU, 512 MiB, request timeout 60 seconds.
- The process listens on `process.env.PORT` and `0.0.0.0`.
- `GET /health` returns a static `200` and does not open a database connection. No other route is public.
- Same-origin production: an empty `VITE_API_BASE_URL` means requests go to `/api` on the page origin. Development keeps `http://localhost:3001` and the Vite origin allow-list.
- `SIGTERM` stops new connections, finishes in-flight requests, then closes the pool.
- IndexedDB and client calculations are unchanged. An unsent evening exists only on the phone.

## Database

Use `pg` with a pool against Neon’s pooled connection string. Keep the direct connection string for `pg_dump` and restore only.

- `max` around 3, idle timeout around 5 seconds, connection timeout around 10 seconds, TLS on.
- Listen for pool errors so a dropped idle connection does not exit the process.
- Store dates and timestamps as `TEXT`. Store amounts as `INTEGER`.
- Apply numbered SQL migrations, recorded in `schema_migrations`. `CREATE TABLE IF NOT EXISTS` is not a migration.
- Preserve session submit behavior: one transaction for the session and its rows, rollback on failure, identical retry returns the stored session, different content for the same session id returns `409`.
- Map PostgreSQL `23505` on `sessions_pkey` to the existing retry, `23505` on `transactions_pkey` to `409`, and `23503` to `400`.

`better-sqlite3` leaves the server when this migration lands. Do not add an ORM.

## Access

HTTP Basic Auth covers the static application and `/api`. The username is `operator`. The password is compared as a SHA-256 digest with `crypto.timingSafeEqual`. A missing password fails the check. A failure responds `401` with `WWW-Authenticate: Basic realm="Poker Tracker"`.

`APP_PASSWORD` is required in production. The process refuses to start when production mode is on and the password is unset. Local development leaves the gate off only when `APP_PASSWORD` is unset and the process is not in production.

The password is generated, at least 20 characters, and is never committed, logged, or copied into the image. `index.html` and `/api` responses send `Cache-Control: no-store`. Hashed assets may use private caching. Request logs must not include the `Authorization` header.

## Secrets

Secret Manager holds the pooled database URL, the direct database URL, and `APP_PASSWORD`. The Cloud Run runtime service account can read those secrets. The deploy identity does not receive the secret values. GitHub Actions does not store the production database URL.

## Tests

| Suite | Where it runs | Database |
| --- | --- | --- |
| Schema, atomic insert, rollback, idempotent retry, constraint mapping | Every local `npm test` | PGlite |
| The same suite, plus two overlapping submits of one session id | Every CI run | Empty Postgres service container |
| Short smoke of health, create player, submit, and identical retry | Manual, against a branch created for that run | Neon `aws-eu-central-1`, never the production branch |

PGlite serializes connections, so a local pass does not prove the concurrent session-id race. CI Postgres does. The production Neon URL is not a test database.

## Delivery

The image is a multi-stage Node 22 build. The runtime contains production dependencies, the compiled server, and `client/dist`. It does not contain `tsx`, a SQLite file, or `better-sqlite3`.

GitHub Actions on push to `main` runs the test suite against the Postgres service, builds the image, pushes it to Artifact Registry in `me-west1`, and deploys that image. Authentication to Google Cloud uses Workload Identity Federation.

The first deploy is manual: billing budget alert, Artifact Registry, the Neon project in `aws-eu-central-1`, the Cloud Run service in `me-west1`, and secrets mounted. A smoke test uses a non-production Neon branch.

## Recovery

Neon Free keeps about six hours of instant-restore history and one manual snapshot. That window is not the backup.

`pg_dump` in custom format uses the direct URL. The dump lives outside Neon. Restore with `pg_restore` into a fresh branch or project, then check row counts for `players`, `sessions`, and `transactions` and read one known session through the API. One successful restore is required before the database is the only copy of a real evening.

## Cost bounds

Expect about $0–1 per month at evening volume while the service scales to zero and stays inside the Cloud Run and Neon Free allowances. That is not a guaranteed $0 bill. Google Cloud requires a billing account. Budget alerts send email and do not stop charges. Neon Free suspends compute at its quota and keeps the data. Do not point a periodic probe at the database. Do not set a minimum instance.
