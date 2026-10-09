# Frontend architecture

The application is a frontend-only modular monolith. Synthetic records are the default data source; no backend, authentication service, or live model is included.

## Layers

- `src/app`: composition root, routing, providers, and shell concerns.
- `src/features`: feature pages and feature-specific components. Existing screens are being migrated incrementally from the compatibility implementation.
- `src/domain`: domain entities and repository contracts.
- `src/application`: framework-independent workflows and mutations.
- `src/data-access`: mock and HTTP repository adapters.
- `src/infrastructure`: environment, HTTP transport, persistence, and error normalization.
- `src/shared`: genuinely reusable UI and utilities.
- `src/data`: seed records used only by the mock adapter.

## State ownership

Domain data is loaded through repositories and owned by the application composition layer. Transient UI state remains local to feature components. Navigable page and case identity are represented in the URL. Theme is an application preference persisted separately from demo business data.

## Modes

`VITE_DATA_MODE=mock` uses local synthetic records and versioned browser persistence. `VITE_DATA_MODE=api` selects the provisional HTTP repositories; it never silently falls back to mock data.

The current UI is retained as a compatibility module while feature extraction proceeds. This is intentional: it keeps the demonstrated workflows usable during migration.
