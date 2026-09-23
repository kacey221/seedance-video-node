const fs = require('node:fs');
const fsp = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const launcherStateDir = path.join(projectRoot, 'storage', '.launcher');
const launcherStateFile = path.join(launcherStateDir, 'start-app-state.json');
const launcherStdoutLog = path.join(launcherStateDir, 'server.stdout.log');
const launcherStderrLog = path.join(launcherStateDir, 'server.stderr.log');
const tsxCliPath = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const FIXED_PORT = 3011;
const readinessPath = '/api/config-status';
const isForegroundMode = process.argv.includes('--foreground');

async function main() {
  try {
    await ensureDir(launcherStateDir);
    await killManagedServer();

    const port = await pickFixedPort();
    const url = `http://localhost:${port}`;

    console.log(
      isForegroundMode
        ? `Starting app in this window on ${url} ...`
        : `Starting background app on ${url} ...`,
    );
    const child = isForegroundMode
      ? await startForegroundServer(port)
      : await startBackgroundServer(port);

    await writeLauncherState({
      pid: child.pid,
      port,
      startedAt: new Date().toISOString(),
    });

    const readyPromise = waitForReady(url, 30000).then((isReady) => {
      if (!isReady) {
        console.warn('The app did not report ready within 30 seconds. Opening the target page anyway.');
      }

      openBrowser(url);
      return isReady;
    });

    if (isForegroundMode) {
      await readyPromise;
      await waitForChildExit(child);
      await removeLauncherState();
      return;
    }

    await readyPromise;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

function getNpmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? 'pipe',
      windowsHide: options.windowsHide ?? false,
    });

    let stderr = '';

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}.`));
    });
  });
}

async function killManagedServer() {
  const state = await readLauncherState();
  if (state?.pid) {
    await killProcessTree(state.pid);
  }

  const managedPids = await findManagedProcessIds();
  for (const pid of managedPids) {
    await killProcessTree(pid);
  }

  await removeLauncherState();
}

async function readLauncherState() {
  try {
    const raw = await fsp.readFile(launcherStateFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function removeLauncherState() {
  try {
    await fsp.unlink(launcherStateFile);
  } catch {}
}

async function writeLauncherState(state) {
  await ensureDir(path.dirname(launcherStateFile));
  await fsp.writeFile(launcherStateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function escapePowerShellLiteral(input) {
  return input.replace(/'/g, "''");
}

async function findManagedProcessIds() {
  const projectLiteral = escapePowerShellLiteral(projectRoot);
  let output;

  try {
    output = await captureCommand('powershell', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      [
        `$projectPath = '${projectLiteral}';`,
        `$matcher = { param($process) $process.CommandLine -and $process.CommandLine -like ('*' + $projectPath + '*') -and ($process.CommandLine -like '*dist\\server.cjs*' -or $process.CommandLine -like '*server.ts*' -or $process.CommandLine -like '*npm run dev*') };`,
        'Get-CimInstance Win32_Process | Where-Object { & $matcher $_ } | Select-Object -ExpandProperty ProcessId',
      ].join(' '),
    ]);
  } catch {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid);
}

async function killProcessTree(pid) {
  try {
    await runCommand('taskkill', ['/PID', String(pid), '/T', '/F'], {
      cwd: projectRoot,
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch {}
}

async function captureCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}.`));
    });
  });
}

async function pickFixedPort() {
  if (await isPortAvailable(FIXED_PORT)) {
    return FIXED_PORT;
  }

  throw new Error(`固定端口 ${FIXED_PORT} 已被占用，请先关闭占用该端口的程序后重试。`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function startBackgroundServer(port) {
  const command = process.platform === 'win32' ? 'cmd.exe' : process.execPath;
  const args =
    process.platform === 'win32'
      ? ['/c', 'start', '', '/b', 'node', tsxCliPath, 'server.ts']
      : [tsxCliPath, 'server.ts'];

  const child = spawn(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
  });

  child.unref();

  if (!child.pid) {
    throw new Error('Failed to start the background dev server.');
  }

  return child;
}

async function startForegroundServer(port) {
  const child = spawn(process.execPath, [tsxCliPath, 'server.ts'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    detached: false,
    windowsHide: false,
    stdio: 'inherit',
  });

  if (!child.pid) {
    throw new Error('Failed to start the foreground dev server.');
  }

  return child;
}

async function waitForReady(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const response = await fetch(`${url}${readinessPath}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return true;
      }
    } catch {}

    await sleep(400);
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForChildExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () => resolve());
  });
}

function openBrowser(url) {
  const child = spawn('cmd.exe', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  child.unref();
}

void main();
