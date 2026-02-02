# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/UNKNOWN/UNKNOWN/compare/0.1.0...HEAD
[0.1.0]: https://github.com/UNKNOWN/UNKNOWN/releases/tag/0.1.0
