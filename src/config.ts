import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AppConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

function configDir(): string {
  const appData =
    process.env['APPDATA'] ??
    join(homedir(), process.platform === 'win32' ? '' : '.config');
  return join(appData, 'notified');
}

function configPath(): string {
  return join(configDir(), 'config.json');
}

export function loadConfig(): AppConfig | null {
  const path = configPath();
  if (!existsSync(path)) {
    return null;
  }

  try {
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: AppConfig): void {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8');
}

export function ensureConfig(clientId: string): AppConfig {
  const existing = loadConfig();
  if (existing) {
    return existing;
  }

  const config: AppConfig = { clientId, ...DEFAULT_CONFIG };
  saveConfig(config);
  return config;
}

export function updateConfig(patch: Partial<AppConfig>): AppConfig {
  const existing = loadConfig();
  if (!existing) {
    throw new Error('Config not yet initialised – call ensureConfig first.');
  }

  const updated = { ...existing, ...patch };
  saveConfig(updated);
  return updated;
}
