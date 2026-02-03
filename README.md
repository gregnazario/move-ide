# Aptos Move Playground

A browser-based interactive playground for Aptos Move, inspired by the Rust Playground. Write, compile, run, test, and share Move code directly in your browser.

## Features

- 🎨 **Monaco Editor** with Move syntax highlighting
- 🚀 **Real-time execution** via WebSocket streaming
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
