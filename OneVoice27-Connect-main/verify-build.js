#!/usr/bin/env node
import { scanBuildOutput } from './scan-build-pii.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || path.resolve(__dirname, 'dist');
const result = scanBuildOutput(target);
process.exit(result.success ? 0 : 1);
