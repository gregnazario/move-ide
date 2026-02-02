# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Rust (Axum) API + WebSocket server. Key areas: `src/api/`, `src/service/`, `src/sandbox/`, `src/types/`.
- `frontend/`: React + Vite + TypeScript UI. Key areas: `src/components/`, `src/hooks/`, `src/store/`, `src/lib/`.
- `docs/`: Design/spec documents.
- `docker-compose.yml`: Local multi-service setup.

## Build, Test, and Development Commands
- Backend dev server: `cd backend && cargo run` (starts API on `http://localhost:8080`).
- Frontend dev server: `cd frontend && npm install && npm run dev` (UI on `http://localhost:3000`, proxies to backend).
- Frontend build: `cd frontend && npm run build` (TypeScript build + Vite bundle).
- Frontend lint: `cd frontend && npm run lint` (Biome).
- Full stack via Docker: `docker-compose up --build` (frontend + backend).

## Coding Style & Naming Conventions
- Indentation: 4 spaces (see `frontend/src/main.tsx` and Rust defaults).
- TypeScript/React: PascalCase components (`Header.tsx`), camelCase functions, `useX` hook names.
- Rust: snake_case modules/functions, `mod.rs` for module roots.
- Formatting: use Biome for TypeScript, `cargo fmt` for Rust.
- Linting: use `cargo clippy` for Rust.

## Testing Guidelines
- Backend unit tests live alongside modules (example: `backend/src/service/parser.rs`).
- Run backend tests with `cd backend && cargo test`.
- No dedicated frontend test runner is configured yet; prefer manual UI checks and `npm run lint`.
- Playground test execution uses the Aptos CLI (`aptos move test`) during runtime, not as a CI test suite.

## Commit & Pull Request Guidelines
- No commit history exists yet, so no enforced convention. Use short, imperative subjects (e.g., “Add workspace cleanup”) and include a scope when helpful (`frontend:`/`backend:`).
- PRs should include: a concise summary, any related issue links, and UI screenshots or GIFs for frontend changes.

## Configuration & Environment Tips
- Backend reads environment variables (see `backend/src/config.rs`), including `PLAYGROUND_PORT`, `PLAYGROUND_TIMEOUT_SECS`, and `GITHUB_TOKEN` for Gist sharing.
- Local `.env` is supported via `dotenvy`; keep secrets out of version control.
