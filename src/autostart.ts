import { spawn } from 'node:child_process';

const APP_NAME = 'LapseNotifier';

function getRegistryKey(): string {
  return `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
}

async function runReg(args: string[]): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const proc = spawn('reg', args, { stdio: 'ignore' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false)); // reg not found (non-Windows)
  });
}

/**
 * Enables auto-start by adding a registry entry pointing to the current executable.
 * No-op on non-Windows systems.
 */
export async function enableAutoStart(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  const exePath = process.execPath;
  return runReg([
    'add',
    getRegistryKey(),
    '/v',
    APP_NAME,
    '/t',
    'REG_SZ',
    '/d',
    exePath,
    '/f',
  ]);
}

/**
 * Disables auto-start by removing the registry entry.
 * No-op on non-Windows systems.
 */
export async function disableAutoStart(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  return runReg(['delete', getRegistryKey(), '/v', APP_NAME, '/f']);
}

/**
 * Returns `true` if the startup registry entry exists.
 */
export async function isAutoStartEnabled(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  return runReg(['query', getRegistryKey(), '/v', APP_NAME]);
}
