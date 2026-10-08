#!/usr/bin/env bash
set -e

echo "[Build Script] Running Vite build..."
npx vite build

echo "[Build Script] Scanning build output for forbidden PII strings..."
node scan-build-pii.js dist
