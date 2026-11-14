# TKT-036 — Require the operator password

**Status:** done  
**Issue:** #36  
**Milestone:** M8 Production deployment  
**Depends on:** [TKT-035](TKT-035-production-http-host.md) (#35)

## Goal

A browser must present the operator password before it can load the application or call the API.

## Scope

- Require HTTP Basic Auth for the static application and `/api`. Leave `GET /health` public.
- Use the username `operator`. Compare SHA-256 digests of the password with `crypto.timingSafeEqual`.
- On failure, respond `401` with `WWW-Authenticate: Basic realm="Poker Tracker"`.
- Read the password from `APP_PASSWORD`. In production, refuse to start when it is unset. When it is unset outside production, leave the gate off.
- Send `Cache-Control: no-store` on `index.html` and `/api` responses.
- Do not log the `Authorization` header.

## Out of scope

- Creating the Secret Manager secrets and the Cloud Run service. That is [TKT-038](TKT-038-first-cloud-deploy.md).
- Player accounts, sessions, cookies, and a login screen.
- A user table or a change to the OpenAPI contract.

## Implementation notes

- Follow the access section of [docs/deployment.md](../docs/deployment.md).
- The password is supplied by the environment. The ticket does not generate or store a real password in the repository.

## Acceptance criteria

- [x] An unauthenticated request for `/` and for `/api/players` receives `401` and `WWW-Authenticate`.
- [x] The correct Basic credentials can load the shell and call the API.
- [x] `GET /health` stays public and still does not open a database connection.
- [x] Production startup fails when `APP_PASSWORD` is unset.
- [x] Development startup without `APP_PASSWORD` still serves the local API.
- [x] `npm test` from the repository root passes.
