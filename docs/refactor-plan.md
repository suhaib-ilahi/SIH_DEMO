# SIH frontend refactor plan

## Baseline

The current application is a working React/Vite synthetic-data demonstration. Its UI, navigation state, and most feature implementations are concentrated in `src/App.tsx`; `src/service.ts` owns local persistence and `src/data.ts` owns seed records. The first priority is preserving those workflows while introducing boundaries around them.

## Migration phases

1. **Application shell and routing**: add a composition root, URL-aware navigation, and keep the existing feature implementation as a compatibility module.
2. **Domain and data access**: define domain exports and repository contracts, then provide mock and HTTP implementations behind a provider.
3. **Application workflows**: move coordinated mutations (case changes, notes, alerts, interventions, and audit entries) behind use-case functions.
4. **Feature extraction**: extract one feature at a time from the compatibility module into `src/features/*`, starting with cases and investigation because they carry the most shared context.
5. **Verification**: build, type-check, test repository behavior, verify deep links, persistence, reset, and existing synthetic workflows.

## Dependency boundaries

- Components and feature pages consume application hooks/use-cases; they do not import seed data or access business-data `localStorage`.
- Application workflows depend on repository contracts.
- Domain types and contracts do not depend on React, browser APIs, or HTTP libraries.
- Mock repositories own seed data and persistence.
- HTTP repositories own transport, DTO mapping, and API endpoint details.

## Risks and mitigations

- **Regression risk during extraction**: retain the compatibility module until each extracted feature is verified.
- **Persisted demo data schema drift**: use a versioned storage key and reset malformed/unsupported records safely.
- **Mock/API behavior divergence**: require both providers to implement the same asynchronous contracts.
- **Deep-link failures in static hosting**: document server fallback requirements and provide an application not-found state.

## Verification strategy

Run `npm run build`, then test repository contracts and the critical flows: case navigation, case mutation plus audit, reset, theme persistence, and direct URL entry. Browser smoke tests remain necessary for maps, charts, and responsive layouts.
