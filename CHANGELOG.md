# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]
### Fixed
- Prevented `aptos move run` from passing unsupported flags and added validation for missing entry function.
- Terminated long-running executions on timeout to avoid stray processes and workspace deletion errors.
- macOS: compile/run/test no longer fail with `Invalid argument (os error 22)` — the address-space rlimit is now applied only on Linux where `RLIMIT_AS` is supported (the file-size limit still applies on all platforms).
- Move editor tokenizer no longer logs a registration warning for address-literal rules (`@0x…`) caused by an unescaped `@` in the Monarch regex.
### Changed
- Security patch pass across dependencies: axios, dompurify, form-data, follow-redirects, postcss, nanoid, rollup, vite, @babel/core (frontend) and openssl, rustls-webpki, rand plus transitive bumps (backend); `cargo audit` clean.
- Dependabot now manages cargo, npm, and GitHub Actions ecosystems with weekly grouped minor/patch updates.
- Dropped the direct `@aptos-labs/aptos-cli` dependency (unused in app code since the serverless-mode removal; the Aptos SDK still installs it transitively).
- Pinned `monaco-editor` to a version compatible with `monaco-vim`'s ESM entry points.
### Added
- SVG favicon and Safari pinned-tab icon alongside the existing PNG icon set; expanded web-manifest metadata (`id`, `scope`, description, categories).
- `PLAYGROUND_BACKEND_ORIGIN` environment override for the Vite dev proxy when the backend runs on a non-default port.
- README rewritten around the current WebSocket-only architecture with screenshots; added MIT `LICENSE` file.

## [0.1.0] - 2026-02-02
### Added
- Contributor guide (`AGENTS.md`) covering repo structure, commands, style, and tooling.
- Root Biome config (`biome.json`) and top-level `Makefile` tasks (`make format`, `make lint`).
- Lint/format documentation in `README.md`.

### Changed
- Frontend tooling switched to Biome (`frontend/package.json` scripts and deps).
- TypeScript components updated to satisfy Biome rules (a11y, typing, safer DOM handling).

### Fixed
- Rust clippy warnings in backend API, error, and workspace modules.

[Unreleased]: https://github.com/gregnazario/move-ide/compare/0.1.0...HEAD
[0.1.0]: https://github.com/gregnazario/move-ide/releases/tag/0.1.0
