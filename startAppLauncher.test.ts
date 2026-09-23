import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const batchLauncher = readFileSync(new URL('./start-app.bat', import.meta.url), 'utf8');
const nodeLauncher = readFileSync(new URL('./scripts/start-app.cjs', import.meta.url), 'utf8');

test('batch launcher delegates to the Node background launcher script', () => {
  assert.match(batchLauncher, /node\s+"%~dp0scripts\\start-app\.cjs"/i);
  assert.doesNotMatch(batchLauncher, /npm run dev/i);
  assert.match(batchLauncher, /--foreground/i);
});

test('node launcher starts the latest fullstack dev server instead of a stale dist build', () => {
  assert.match(
    nodeLauncher,
    /path\.join\(projectRoot,\s*'node_modules',\s*'tsx',\s*'dist',\s*'cli\.mjs'\)/i,
  );
  assert.match(nodeLauncher, /server\.ts/i);
  assert.doesNotMatch(nodeLauncher, /\['run',\s*'build'\]/i);
  assert.doesNotMatch(
    nodeLauncher,
    /spawn\([^)]*dist[\\/]+server\.cjs/i,
  );
});

test('node launcher supports a foreground server mode for reliable click-to-open startup', () => {
  assert.match(nodeLauncher, /--foreground/i);
  assert.match(nodeLauncher, /stdio:\s*'inherit'/i);
  assert.match(nodeLauncher, /windowsHide:\s*false/i);
});

test('node launcher uses fixed port 3011', () => {
  assert.match(nodeLauncher, /const FIXED_PORT = 3011/i);
  assert.match(nodeLauncher, /async function pickFixedPort\(\)/i);
  assert.doesNotMatch(nodeLauncher, /portCandidates/i);
});

test('node launcher records and stops the previous managed server before restart', () => {
  assert.match(nodeLauncher, /start-app-state\.json/i);
  assert.match(nodeLauncher, /taskkill/i);
  assert.match(nodeLauncher, /killManagedServer/i);
});

test('node launcher does not silently reuse an old managed server after code changes', () => {
  assert.doesNotMatch(nodeLauncher, /Opening existing background app/i);
  assert.doesNotMatch(nodeLauncher, /findReusableManagedServerUrl/i);
});

test('node launcher tolerates process-inspection permission failures during cleanup', () => {
  assert.match(nodeLauncher, /async function findManagedProcessIds\(\)/i);
  assert.match(nodeLauncher, /try\s*\{[\s\S]*captureCommand\('powershell'/i);
  assert.match(nodeLauncher, /catch(?:\s*\([^)]*\))?\s*\{\s*return\s*\[\s*\];?\s*\}/i);
});

test('node launcher waits for config-status readiness and opens the browser automatically', () => {
  assert.match(nodeLauncher, /api\/config-status/i);
  assert.match(nodeLauncher, /spawn\('cmd(?:\.exe)?',\s*\['\/c',\s*'start'/i);
});
