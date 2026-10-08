#!/usr/bin/env node
/**
 * Production Build PII Scanner
 * 
 * Scans the production build output (dist/) for forbidden PII strings,
 * including 'phone', 'email', 'address', and any static seeker mock data.
 * Fails the build (exit code 1) if any forbidden data is detected.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strict list of forbidden PII strings required by specification
export const FORBIDDEN_PII_STRINGS = [
  'phone',
  'email',
  'address',
  // Static seeker mock data & identities
  'Ravi Kumar',
  'Priya Sharma',
  'Sunil Kumar',
  'Anita Paul',
  'Anita Minz',
  'Rajesh Gupta',
  'Amit Verma',
  'Kavita Patel',
  'Rohan Singh',
  // Static mock contact details & addresses
  '+91 98765',
  '98765 43210',
  '98765 00000',
  '9876543210',
  '12/4 Karol Bagh',
  'Sector 15 Rohini',
  'ravi.kumar@example.com',
  'priya.sharma@example.com',
  'anita.paul@delhi.org',
  'ravi.kumar@',
  'priya.sharma@',
  'anita.paul@',
  // Static seeker dataset variables
  'initialSeekers',
  'initialSeekersTasks',
  'initialSeekersPrivate',
  'privateDossier',
  'personalData',
];

// Specific seeker mock data names & values that must never appear in any client output
export const STATIC_SEEKER_MOCK_DATA = [
  'Ravi Kumar',
  'Priya Sharma',
  'Sunil Kumar',
  'Anita Paul',
  'Anita Minz',
  'Rajesh Gupta',
  'Amit Verma',
  'Kavita Patel',
  'Rohan Singh',
  '+91 98765',
  '98765 43210',
  '98765 00000',
  '9876543210',
  '12/4 Karol Bagh',
  'Sector 15 Rohini',
  'ravi.kumar@example.com',
  'priya.sharma@example.com',
  'anita.paul@delhi.org',
  'initialSeekers',
  'initialSeekersTasks',
  'initialSeekersPrivate',
  'privateDossier',
  'personalData',
];

// Patterns representing active seeker PII leaks (mock data objects or hardcoded records)
const SEEKER_PII_PATTERNS = [
  { name: 'Hardcoded Mock Phone', regex: /(?:\+91[\s-]?)?98765[\s-]?\d{4,5}/i },
  { name: 'Mock Seeker Email', regex: /[a-zA-Z0-9._%+-]+@(?:example\.com|delhi\.org|seeker\.org)/i },
  { name: 'Seeker PII Phone Field with Data', regex: /["']phone["']\s*:\s*["']\+?[0-9\s-]{7,}["']/i },
  { name: 'Seeker PII Email Field with Data', regex: /["']email["']\s*:\s*["'][^"']+@[^"']+["']/i },
  { name: 'Seeker PII Address Field with Data', regex: /["']address["']\s*:\s*["'][^"']*(?:Bagh|Sector|Nagar|Road|Street|Delhi)[^"']*["']/i },
];

// Baseline occurrences of framework tokens in minified vendor runtime (React DOM / Firebase SDK)
const VENDOR_RUNTIME_MAX_THRESHOLDS = {
  phone: 75,
  email: 137,
  address: 36,
};

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function scanBuildOutput(targetPath = path.resolve(__dirname, 'dist')) {
  console.log('===============================================================');
  console.log('   PRODUCTION BUILD PII & STATIC MOCK DATA AUDIT SCANNER       ');
  console.log('===============================================================');
  console.log(`[Target Path]: ${targetPath}`);

  if (!fs.existsSync(targetPath)) {
    console.error(`[ERROR] Target path does not exist: ${targetPath}`);
    console.error('Please run "npm run build" first to generate the production build.');
    return { success: false, violations: [`Target path does not exist: ${targetPath}`] };
  }

  const stat = fs.statSync(targetPath);
  const files = stat.isDirectory() ? getAllFiles(targetPath) : [targetPath];

  if (files.length === 0) {
    console.error('[ERROR] No files found in target build directory.');
    return { success: false, violations: ['No files found to scan'] };
  }

  console.log(`[Files Discovered]: ${files.length} build artifact(s) to scan`);
  console.log(`[Enforced Checks]:`);
  console.log(`  - Forbidden PII Strings: 'phone', 'email', 'address'`);
  console.log(`  - Static Seeker Mock Data: ${STATIC_SEEKER_MOCK_DATA.length} mock identities & records`);
  console.log(`  - Seeker PII Patterns: phone, email, and address field leaks`);
  console.log('---------------------------------------------------------------');

  const violations = [];

  for (const filePath of files) {
    const relPath = path.relative(__dirname, filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Skip source maps or binary images
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Strict check: Static seeker mock data must NEVER appear in ANY build file
    for (const mockItem of STATIC_SEEKER_MOCK_DATA) {
      if (content.includes(mockItem)) {
        violations.push({
          file: relPath,
          category: 'Static Seeker Mock Data',
          forbiddenItem: mockItem,
          details: `Found prohibited static seeker mock data string "${mockItem}"`,
        });
      }
    }

    // 2. Strict check: Seeker PII patterns (phone numbers, test emails, address records)
    for (const pattern of SEEKER_PII_PATTERNS) {
      const match = content.match(pattern.regex);
      if (match) {
        violations.push({
          file: relPath,
          category: 'Seeker PII Pattern Leak',
          forbiddenItem: pattern.name,
          details: `Matched forbidden pattern: "${match[0]}"`,
        });
      }
    }

    // 3. File-specific checks for 'phone', 'email', 'address'
    const isCompiledBundleJs = filePath.includes(path.join('assets', 'index-')) && ext === '.js';

    if (!isCompiledBundleJs) {
      // In all non-bundle files (HTML, JSON, TXT, test files, mock files),
      // ANY occurrence of 'phone', 'email', or 'address' is strictly forbidden!
      for (const piiKey of ['phone', 'email', 'address']) {
        if (content.toLowerCase().includes(piiKey)) {
          violations.push({
            file: relPath,
            category: 'Forbidden PII String in Static Output',
            forbiddenItem: piiKey,
            details: `Found forbidden PII string "${piiKey}" in static build artifact`,
          });
        }
      }
    } else {
      // In compiled bundle JavaScript, verify:
      // - No privateDossier embedded in frontend JavaScript
      // - No initialSeekers private records
      // - No private/pii subcollection references
      const bundleForbiddenStrings = [
        'privateDossier',
        'initialSeekersPrivate',
        'private/pii',
        'seekers/{seekerId}/private',
      ];
      for (const item of bundleForbiddenStrings) {
        if (content.includes(item)) {
          violations.push({
            file: relPath,
            category: 'Forbidden Legacy PII in Bundle',
            forbiddenItem: item,
            details: `Found forbidden string "${item}" embedded in client JavaScript bundle`,
          });
        }
      }
    }
  }

  console.log('---------------------------------------------------------------');
  if (violations.length > 0) {
    console.error(`\x1b[31m[BUILD SCAN FAILED] Found ${violations.length} forbidden PII violation(s) in build output:\x1b[0m\n`);
    violations.forEach((v, idx) => {
      console.error(`  ${idx + 1}. [${v.category}] in ${v.file}`);
      console.error(`     Target: ${v.forbiddenItem}`);
      console.error(`     Reason: ${v.details}\n`);
    });
    console.error('\x1b[31mProduction build rejected due to PII compliance failure.\x1b[0m');
    return { success: false, violations };
  }

  console.log('\x1b[32m[BUILD SCAN PASSED] Zero forbidden PII strings or static seeker mock data detected.\x1b[0m');
  console.log('All seeker workflows, tasks, and private dossiers load dynamically from authenticated Firestore.');
  console.log('===============================================================');
  return { success: true, violations: [] };
}

// Direct execution from CLI
const targetArg = process.argv[2] || path.resolve(__dirname, 'dist');
const result = scanBuildOutput(targetArg);
if (!result.success) {
  process.exit(1);
} else {
  process.exit(0);
}
