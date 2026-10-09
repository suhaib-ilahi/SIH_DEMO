# Provisional API contracts

These routes are proposed contracts for a future backend. They are **not implemented by this repository** and must not be treated as live endpoints.

All timestamps are ISO 8601 strings with an explicit timezone. IDs are stable opaque strings. List endpoints should support pagination and filters and return `{ items, total, nextCursor? }`.

| Resource | Method and route | Purpose |
|---|---|---|
| Cases | `GET /cases`, `GET /cases/{id}`, `PATCH /cases/{id}` | List, inspect, and update case status/assignment |
| Complaints | `GET /complaints`, `GET /complaints/{id}` | Retrieve complaint records |
| Transactions | `GET /cases/{id}/transactions` | Retrieve observed transaction trail |
| Entities | `GET /cases/{id}/relationships` | Retrieve linked entities and provenance |
| Predictions | `GET /predictions`, `GET /predictions/{id}` | Retrieve prediction history and candidates |
| Prediction jobs | `POST /prediction-jobs` | Request an asynchronous prediction refresh; returns a job ID |
| Interventions | `GET /interventions`, `PATCH /interventions/{id}` | Review and track advisory recommendations |
| Outcomes | `POST /interventions/{id}/outcomes` | Record a simulated or authorised outcome |
| Warnings | `GET /warnings`, `PATCH /warnings/{id}` | Review early-warning records |
| Alternate exits | `POST /cases/{id}/alternate-exits` | Record a newly observed route event |
| Alerts | `GET /alerts`, `PATCH /alerts/{id}` | Inbox and acknowledgement lifecycle |
| Notes | `GET /cases/{id}/notes`, `POST /cases/{id}/notes` | Investigation notes |
| Evidence | `GET /cases/{id}/evidence`, `POST /cases/{id}/evidence` | Evidence metadata only |
| Audit | `GET /audit-events` | Activity and audit history |
| Strategic | `GET /strategic-patterns` | Aggregated intelligence patterns |

Mutating routes should return the updated domain record and use `400` for validation, `404` for missing IDs, `409` for conflicting state, and `5xx` for server failures. Authentication and authorization must be enforced by the backend; no browser `VITE_*` variable may contain secrets.
