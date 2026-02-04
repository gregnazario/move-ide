.PHONY: lint format test test-e2e check-node

check-node:
	node -e "const major=Number(process.versions.node.split('.')[0]); if (Number.isNaN(major)||major<22){console.error('Node >= 22 required'); process.exit(1);}"

lint: check-node
	cd backend && cargo clippy
	cd frontend && bun run lint

format: check-node
	cd backend && cargo fmt
	cd frontend && bun run format

test: check-node
	cd backend && cargo test
	cd frontend && bun run test

test-e2e: check-node
	cd frontend && bun run test:e2e
