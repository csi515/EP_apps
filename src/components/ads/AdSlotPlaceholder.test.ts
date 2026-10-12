import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

async function runTests() {
  console.log('Running Cloudflare & AdSlotPlaceholder verification tests...');

  // 1. public/_redirects verification
  const redirectsPath = join(root, 'public/_redirects');
  assert.ok(existsSync(redirectsPath), 'public/_redirects file must exist');
  const redirectsContent = readFileSync(redirectsPath, 'utf8').trim();
  assert.match(
    redirectsContent,
    /^\/\*\s+\/index\.html\s+200$/m,
    'public/_redirects must contain SPA single routing rule: /* /index.html 200'
  );

  // 2. public/ads.txt verification
  const adsTxtPath = join(root, 'public/ads.txt');
  assert.ok(existsSync(adsTxtPath), 'public/ads.txt file must exist');
  const adsTxtContent = readFileSync(adsTxtPath, 'utf8');
  assert.match(
    adsTxtContent,
    /google\.com,\s*pub-\d+,\s*DIRECT,\s*f08c47fec0942fa0/,
    'public/ads.txt must contain standard Google AdSense direct seller entry'
  );
  assert.match(adsTxtContent, /#/, 'public/ads.txt must include helpful guide comments');

  // 3. AdSlotPlaceholder component CLS 0% defense
  const adComponentPath = join(root, 'src/components/ads/AdSlotPlaceholder.tsx');
  assert.ok(existsSync(adComponentPath), 'AdSlotPlaceholder.tsx must exist');
  const adComponentContent = readFileSync(adComponentPath, 'utf8');
  assert.match(
    adComponentContent,
    /h-64|min-h-64|minHeight/,
    'AdSlotPlaceholder must enforce fixed minimum height (h-64 / 256px) for CLS 0%'
  );
  assert.match(
    adComponentContent,
    /contain:\s*['"]layout style paint['"]/,
    'AdSlotPlaceholder must isolate CSS layout paint containment'
  );

  // 4. Placed only on Public Landing and Customer MyPage
  const landingPath = join(root, 'src/core/public/PublicOrgLanding.tsx');
  const landingContent = readFileSync(landingPath, 'utf8');
  assert.match(
    landingContent,
    /<AdSlotPlaceholder/,
    'PublicOrgLanding must render AdSlotPlaceholder'
  );

  const myPagePath = join(root, 'src/modules/parent/views/ParentMoreView.tsx');
  const myPageContent = readFileSync(myPagePath, 'utf8');
  assert.match(
    myPageContent,
    /<AdSlotPlaceholder/,
    'ParentMoreView must render AdSlotPlaceholder'
  );

  // 5. Zero exposure in Admin workspace
  const adminFiles = [
    'src/pages/dashboard/index.tsx',
    'src/pages/students/index.tsx',
    'src/components/layout/Header.tsx',
    'src/components/layout/Layout.tsx',
    'src/capabilities/billing/TuitionManagementView.tsx',
  ];

  for (const rel of adminFiles) {
    const full = join(root, rel);
    if (existsSync(full)) {
      const content = readFileSync(full, 'utf8');
      assert.doesNotMatch(
        content,
        /AdSlotPlaceholder/i,
        `Admin workspace file ${rel} must NOT contain AdSlotPlaceholder!`
      );
    }
  }

  console.log('Cloudflare & AdSlotPlaceholder tests passed successfully!');
}

void runTests();
