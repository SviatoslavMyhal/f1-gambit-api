#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "error: node is not installed (need Node.js 18+)" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is not installed" >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${NODE_MAJOR}" -lt 18 ]]; then
  echo "error: Node.js 18+ required (found $(node -v))" >&2
  exit 1
fi

if [[ ! -f .env.local ]]; then
  if [[ -f .env.local.example ]]; then
    cp .env.local.example .env.local
    echo "created .env.local from .env.local.example"
  else
    echo "error: .env.local.example missing" >&2
    exit 1
  fi
fi

echo "bootstrap ok ($(node -v), npm $(npm -v))"
