.PHONY: lint format

lint:
	cd backend && cargo clippy
	cd frontend && npm run lint

format:
	cd backend && cargo fmt
	cd frontend && npm run format
