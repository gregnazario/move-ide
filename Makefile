.PHONY: lint format test test-e2e

lint:
	cd backend && cargo clippy
	cd frontend && npm run lint

format:
	cd backend && cargo fmt
	cd frontend && npm run format

test:
	cd backend && cargo test
	cd frontend && npm run test

test-e2e:
	cd frontend && npm run test:e2e
