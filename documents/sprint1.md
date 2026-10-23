# Sprint 1

> **Review notes (remove before final submission):** Each section has its owner in `["name"]` next to the heading. Lines marked **Subject to change** describe work that is not on `dev` yet. If that work is not merged before submission, change those lines to match what is actually on `dev`.

**Quick links**

| What | Where |
| --- | --- |
| Sprint board | TODO: add GitHub Projects board link |
| Issues | [GitHub Issues](https://github.com/BisonRIdes/Comp4350Project/issues) |
| CI workflow | [`.github/workflows/ci.yml`](https://github.com/BisonRIdes/Comp4350Project/actions/workflows/ci.yml) |
| Code quality | [SonarCloud](https://sonarcloud.io/project/overview?id=BisonRIdes_Comp4350Project) |
| API spec | [`documents/openapi.yaml`](../documents/openapi.yaml) |
| Live API docs | https://bisonrides-api.onrender.com/docs |
| Architecture | [Architecture Diagram](../documents/ArchitectureDiagram.png) |
| Backend setup | [`backend/README.md`](../backend/README.md) |
| Frontend setup | [`Frontend/README.md`](../Frontend/README.md) |

## Sprint Summary

The main focus of sprint 1 was to implement the core user flow of Bison Rides for both drivers and riders. This core functionality allows both parties to use the application and get meaningful value out of it as a ride sharing app for commuting to campus.

First off, drivers are able to post rides for others to see, with those posts including important details like starting location and time. If their plans change or if they simply made a typo, drivers are able to update their posted rides to keep the ride's information accurate. In addition, drivers can also delete their rides if they're no longer planning on heading to campus. This ensures that anyone looking for a ride sees up-to-date information about what rides are available to them, allowing them to choose the one that best suits them in terms of their schedule and proximity.

If a rider finds a ride that works for them, they are able to create a request to join that ride. Drivers are then able to view these requests and can choose to either accept or decline them, giving them control over who they feel comfortable offering a ride to. Riders can then check the status of their requests to see whether they were accepted or declined. Additionally, if a rider is for some reason able to get to campus on their own, they are able to cancel their request if they so choose. This removes the request from the driver's list so they know they don't have to pick them up, and it also gives the rider flexibility so they're not locked into a ride they don't want anymore.

This full flow works through our backend API, which is live on Render. The frontend has its home, login and signup pages, and the frontend team is connecting these features to the UI as part of this sprint.

> **Subject to change:** frontend to API integration is not on `dev` yet. If it is not merged before submission, reword this to say the UI work is still in progress.

Alongside the features, we set up the CI/CD pipeline, automatic backend deployment, and an OpenAPI spec that the frontend and backend teams build against.

Overall, what we've implemented so far provides both the riders and drivers who use Bison Rides the core functionality of what we envision for our application, as well as providing us the opportunity to evaluate and iterate on the application's core functionality early on in development. This will help us ensure the core user flow feels good and gives us a solid foundation to build upon in future sprints.

The detailed record of completed work is on the sprint board and in the closed issues.

## Testing Status

**Approach**

- Backend tests use `pytest` with `pytest-asyncio` and FastAPI's `TestClient`.
- Most tests are integration tests. They call each endpoint through the full app (routing, validation, auth header, ORM) against a real SQLite test database. Each test gets a fresh database from an autouse fixture in [`backend/tests/conftest.py`](../backend/tests/conftest.py), and that fixture refuses to run against any database URL without "test" in it.
- Unit tests cover the Pydantic schemas and the SQLAlchemy models directly.
- Test settings come from [`backend/.env.test`](../backend/.env.test). Shared helpers for seeding users, rides and requests are in [`backend/tests/helpers.py`](../backend/tests/helpers.py).
- No mocking library is used yet. Nothing in Sprint 1 calls an outside service, so there was nothing to mock. We will need mocks once Resend (email) and routing are added.

**Current state (on `dev`)**

- 52 tests, all passing.
- 96% line coverage over all backend code except `tests/` (configured in [`backend/.coveragerc`](../backend/.coveragerc)).
- All routers (`rides`, `ride_requests`, `updates`, `users`), `models.py` and `schemas.py` are at 100%.
- The uncovered lines are the Postgres connection string branch in `database.py`, the app lifespan setup in `main.py`, the login stub in `routers/auth.py`, and the password helpers in `util/security.py`, which no endpoint uses yet.
- The frontend has no tests yet. CI lints it with oxlint and type checks it with `tsc` as part of the build.

Coverage is reported on every CI run and uploaded to [SonarCloud](https://sonarcloud.io/project/overview?id=BisonRIdes_Comp4350Project). To run the tests locally, see [Run the tests](../backend/README.md#run-the-tests).

## CI Status

Workflow: [`.github/workflows/ci.yml`](https://github.com/BisonRIdes/Comp4350Project/actions/workflows/ci.yml)

**Triggers:** every pull request into `dev` or `main`, and every push to `dev` or `main`.

**Jobs:**

| Job | What it does |
| --- | --- |
| `backend` | Installs dependencies on Python 3.12, runs `ruff check`, `ruff format --check`, `pytest` with coverage, then the SonarCloud scan. |
| `frontend` | `npm ci`, lint with oxlint, then `npm run build` (TypeScript check + Vite build). |
| `security` | Trivy file system scan for vulnerable dependencies, leaked secrets and misconfigurations. Fails the build on fixable HIGH or CRITICAL findings. |
| `deploy-backend` | Only on pushes to `dev`, and only after `backend` and `security` pass. Calls the Render deploy hook for that exact commit. |

Branch rules: issue branches come off `dev`, and every PR needs two reviews before merge (see [`sprint0.md`](sprint0.md#additional-process-or-protocol-documentation)).

**Planned next:**

- Frontend tests (unit and component tests) added to the `frontend` job.
- Automatic frontend deploys to Vercel, with preview URLs on PRs.
- A deploy path from `main` once we start merging `dev` into `main`.
- Turn on the SonarCloud quality gate as a required check for merging.

## API Documentation 

- **Spec (source of truth):** [`documents/openapi.yaml`](../documents/openapi.yaml)
- **Live interactive docs:** https://bisonrides-api.onrender.com/docs. Click **Authorize** and enter the API key to try endpoints. Ask a team member for the key.

> **Subject to change** remove ask a team member for the key and replace it with proper known sentence

Endpoints in Sprint 1:

| Area | Endpoints |
| --- | --- |
| Users | `POST /users` |
| Rides | `GET /rides`, `POST /rides`, `PATCH /rides/{ride_id}`, `DELETE /rides/{ride_id}` |
| Ride requests | `GET /drivers/{driver_id}/requests`, `POST /drivers/{driver_id}/requests`, `GET /requests`, `DELETE /requests/{request_id}`, `POST /requests/{request_id}/accept`, `POST /requests/{request_id}/decline` |
| Updates | `GET /updates?user_id=...` |
| Auth | `POST /auth/login` (in spec, not implemented yet) |

## Architecture

![Architecture diagram](../documents/ArchitectureDiagram.png)

The diagram is still the Sprint 0 target design. What we actually built in Sprint 1 differs in a few places:

- **CI/CD.** CI runs on PRs and pushes to `dev` and `main`, not only on merge to `main`. Pushes to `dev` deploy the backend. Render builds the image from [`backend/Dockerfile`](../backend/Dockerfile), so there is no Docker Hub step.
- **API.** Endpoints are served from the root (for example `/rides`), not under `/api/v1`. There is no WebSocket connection yet.
- **Auth.** A shared API key in the `x-key` header, not JWT yet.
- **Not built yet:** Redis cache, OpenRouteService, Stripe, Resend, and the Leaflet map.
- **Frontend.** Not deployed to Vercel and not calling the API yet.

> **Subject to change:** update the frontend bullet once the frontend integration is merged into `dev` (and deployed, if it is).

TODO: decide whether to update the diagram to match these changes or keep it as the target design.

## Deployment 

| Part | Status |
| --- | --- |
| Backend | Live on Render: https://bisonrides-api.onrender.com (open [`/docs`](https://bisonrides-api.onrender.com/docs), other routes need the API key) |
| Database | Supabase Postgres, connected through the session pooler |
| Frontend | Not deployed yet. Runs locally on `http://localhost:5173`. TODO: add Vercel URL if deployed |

> **Subject to change:** update the Frontend row if the frontend is deployed before submission.

Setup and run docs:

- Backend: [`backend/README.md`](../backend/README.md) covers local setup, running the server, tests and coverage, Docker, and environment variables.
- Deployment notes: [`backend/README.md#deployment`](../backend/README.md#deployment) covers the Render setup, the Supabase pooler connection string, and the API key.
- Frontend: [`Frontend/README.md`](../Frontend/README.md)

Note: Render's free tier sleeps when idle, so the first request can take up to about a minute.

## Reflection

**What is one commit, pull request, feature, or technical decision your team is particularly proud of, and why?**

- One technical decision we’re proud of is building our backend endpoints with unit tests written alongside them. Because we tested each endpoint as we built it, we caught bugs early and could make changes without worrying about breaking existing functionality. This gives us a solid foundation for Sprint 2, when more features will depend on these endpoints.

**What is one piece of work that could have been cleaner, easier to integrate, better tested, or otherwise improved, and why?**

- One area that could be improved is our test coverage. We only wrote unit tests this sprint, so we haven’t verified that the frontend and backend work correctly together. In Sprint 2, we plan to add integration tests for our main workflows so problems between components are caught before merging.

**How did testing fit into your workflow?**

- Our unit tests were written alongside the backend, during implementation rather than before or after. This helped in two ways: it saved time, which was limited because of everyone’s busy schedules, and it let us confirm as we went that new code wasn’t breaking existing functionality. This sprint we focused only on unit tests, since our main goal was to build robust backend endpoints that would give the project a strong foundation. Integration tests will come in later sprints, once more services need to communicate with each other. A more test-driven approach would likely have made this sprint harder in the short term. Our endpoints and data models were still changing as we figured out the design, so tests written first would have needed frequent rewrites, and that would have cost time we didn’t have. As our APIs become more stable, we could try writing tests first for new features in the next sprint.

## Known Issues

- **No real user auth.** `POST /auth/login` is a stub and JWT is not implemented. All clients share one API key, so endpoints do not check that the caller owns the ride or request they are changing.
- **Deleting a ride with accepted riders.** Currently returns `409 Conflict`. The team has not decided the final rule yet (for example cancel the ride and email riders instead).
- **Updates feed returns all history.** `GET /updates` returns every accepted or declined request, including ones the rider has already seen. Whether to hide seen updates is still open.
- **Tests run on SQLite, production runs on Postgres.** Postgres specific behaviour, including any future PostGIS queries, is not covered by tests yet.
- **No frontend tests yet.** The frontend only gets lint and build checks

## Incomplete Features

Features that are started or planned but not finished on `dev`:

- **User login.** `POST /auth/login` is in the spec but is a stub. Password hashing helpers exist in `backend/util/security.py` but no endpoint uses them yet. JWT is not implemented.
- **Email notifications (Resend).** Deferred to Sprint 2.
- **Later sprints:** ride matching by route and detour, the Leaflet map, routing with OpenRouteService, payments with Stripe, and the Redis cache.