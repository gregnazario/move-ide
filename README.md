# Aptos Move Playground

A browser-based interactive playground for Aptos Move, inspired by the Rust Playground. Write, compile, run, test, and share Move code directly in your browser.

## Features

- 🎨 **Monaco Editor** with Move syntax highlighting
- 🚀 **Real-time execution** via WebSocket streaming
- ☁️ **Serverless execution** with SSE/poll fallback
- 📁 **Multi-file support** (modules, scripts, packages)
- 🔗 **Share snippets** via GitHub Gists
- 📦 **Export workspace** to a ZIP file
- 🧪 **Test support** with `aptos move test`
- 📊 **Inline error markers** parsed from compiler output
- 🔧 **Named addresses** configuration UI
- 🔐 **AIP-62 wallet support** for devnet publish/run

## Project Structure

```
move-ide/
├── backend/           # Rust/Axum backend
│   ├── src/
│   │   ├── api/       # HTTP + WebSocket handlers
│   │   ├── service/   # Executor, validator, parser
│   │   └── sandbox/   # Temp workspace management
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── store/     # Zustand state
│   │   ├── hooks/     # WebSocket hook
│   │   └── lib/       # Move language config
│   ├── package.json
│   └── Dockerfile
├── docs/              # Design documents
└── docker-compose.yml
```

## Development

### Prerequisites

- Rust 1.75+
- Node.js 20+
- Aptos CLI (`curl -fsSL "https://aptos.dev/scripts/install_cli.sh" | bash`)

### Backend

```bash
cd backend
cargo run
```

The backend runs on `http://localhost:8080`.

### Frontend

```bash
cd frontend
bun install
bun run dev
```

The frontend runs on `http://localhost:3000` and proxies API/WebSocket requests to the backend.

## Docker

Run the entire stack with Docker Compose:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## Linting & Formatting

Top-level tasks:

```bash
make format
make lint
```

Frontend-only (Biome):

```bash
cd frontend
bun run format
bun run lint
```

## Configuration

- `PLAYGROUND_TIMEOUT_SECS` (default: 30) controls the max execution time for compile/run/test.
- `AUTH_JWT_SECRET` is required for frontend-only access control (shared between backend + serverless).
- `PLAYGROUND_FRONTEND_ORIGINS` (comma-separated) controls allowed frontend origins.

### Env vars

Backend (Axum):

```
AUTH_JWT_SECRET=change-me
PLAYGROUND_FRONTEND_ORIGINS=http://localhost:3000
```

Frontend / Vercel Functions:

```
AUTH_JWT_SECRET=change-me
FRONTEND_ORIGINS=http://localhost:3000
AUTH_COOKIE_DOMAIN=.example.com
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
APTOS_CLI_PATH=aptos
```

Generate a secret locally:

```bash
./scripts/gen-auth-secret.sh
```

## Vercel Deployment (Serverless Mode)

1. Create a Vercel project with **Root Directory** set to `frontend/`.
2. Add environment variables (Project → Settings → Environment Variables):
   - `AUTH_JWT_SECRET`
   - `FRONTEND_ORIGINS`
   - `AUTH_COOKIE_DOMAIN` (optional, set to `.example.com` for subdomains)
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `APTOS_CLI_PATH` (optional, if `aptos` is not on PATH)
3. Ensure the Aptos CLI is available in the function runtime:
   - The serverless functions use `@aptos-labs/aptos-cli` from `node_modules/.bin/aptos` by default.
   - Override with `APTOS_CLI_PATH` if you provide a custom binary.
4. Deploy. The frontend will auto-detect WebSocket availability and fall back to serverless.

Note: To use WebSocket mode, the backend must be deployed separately (e.g., Fly/Render) and on the same site/subdomain so the auth cookie is sent.

## API

### WebSocket: `/ws/execute`

Execute Move code with real-time streaming output.
Run commands require an entry function (`--function-id`) and will return a validation error if missing.

### Devnet publish/run

Use the in-app wallet menu to connect an AIP-62 wallet or create a local devnet test account (stored in localStorage). Publish/run transactions are submitted from the browser.

### REST Endpoints

- `GET /health` - Health check
- `POST /api/share` - Create a Gist and return permalink
- `GET /api/load/:id` - Load code from a Gist

## License

MIT
