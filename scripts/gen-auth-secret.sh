#!/usr/bin/env bash
set -euo pipefail

# Generates a base64 AUTH_JWT_SECRET (32 bytes)
openssl rand -base64 32
