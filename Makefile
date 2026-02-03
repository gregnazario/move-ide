.PHONY: lint format test test-e2e

lint:
	cd backend && cargo clippy
	cd frontend && bun run lint

format:
	cd backend && cargo fmt
	cd frontend && bun run format

test:
	cd backend && cargo test
	cd frontend && bun run test

test-e2e:
	cd frontend && bun run test:e2e
