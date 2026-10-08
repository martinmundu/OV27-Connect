#!/usr/bin/env node
/**
 * Root Build Script
 * Executes production build and scans output for forbidden PII strings and static seeker mock data.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanBuildOutput } from './scan-build-pii.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[Build Script] Step 1: Building production bundle with Vite...');
try {
  execSync('npm run build:vite || npx vite build', {
    cwd: __dirname,
    stdio: 'inherit',
  });
} catch (buildErr) {
  console.error('[Build Script] Vite build failed:', buildErr.message);
  process.exit(1);
}

console.log('[Build Script] Step 2: Auditing production build artifacts for forbidden PII strings...');
const distDir = path.resolve(__dirname, 'dist');
const scanResult = scanBuildOutput(distDir);

if (!scanResult.success) {
  console.error('[Build Script] FAILED: Production build contains forbidden PII strings or mock data.');
  process.exit(1);
}

console.log('[Build Script] SUCCESS: Production build compiled and verified clean of all forbidden PII.');
process.exit(0);
