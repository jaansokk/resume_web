# Shared Contracts

`shared/` holds the public request and response contracts used across the repo.

Current scope:

- `contracts.ts`: shared TypeScript interfaces for chat and share payloads

The UI imports these contracts directly. The FastAPI service mirrors the same public shapes with Pydantic models and tests.
