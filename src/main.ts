/**
 * Lapse Notifier – entry point.
 *
 * Run this app in the background and it will periodically check if you have an
 * active Hack Club Lapse session. When one is found, it sends a Windows toast
 * notification so you never forget a running timelapse.
 *
 * First-run: the app will prompt you for your OAuth client ID, then open your
 * browser to complete the Lapse sign-in.
 */

import { createInterface } from 'node:readline';
import { loadConfig, ensureConfig, updateConfig } from './config.js';
import { runCallbackServer, ensureValidToken } from './auth.js';
import { LapseMonitor } from './monitor.js';
import { enableAutoStart, isAutoStartEnabled } from './autostart.js';

const LAPSE_DEV_APPS_URL = 'https://lapse.hackclub.com/developer/apps';

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function openBrowser(url: string): Promise<void> {
  const { default: open } = await import('open');
  await open(url);
}

async function firstRunSetup(): Promise<void> {
  console.log('\n🎬  Lapse Notifier – First-time setup\n');
  console.log(
    `You need a Lapse OAuth app to authenticate.\n` +
      `Register one at: ${LAPSE_DEV_APPS_URL}\n` +
      `Set the redirect URI to: http://localhost:9737/callback\n` +
      `Request scopes: timelapse:read user:read\n`,
  );

  const clientId = await prompt('Enter your OAuth Client ID: ');
  const clientSecret = await prompt('Enter your OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Client ID and secret are required.');
    process.exit(1);
  }

  // Store client secret in environment so auth.ts can pick it up
  process.env['LAPSE_CLIENT_SECRET'] = clientSecret;

  ensureConfig(clientId);

  console.log('\nOpening browser to sign in with Lapse…');

  const tokens = await runCallbackServer(clientId, clientSecret, openBrowser);

  const now = Date.now();
  updateConfig({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: tokens.expires_in ? now + tokens.expires_in * 1000 : undefined,
  });

  console.log('✓ Signed in! Starting monitor…\n');
}

async function run(): Promise<void> {
  let config = loadConfig();

  if (!config || !config.accessToken) {
    await firstRunSetup();
    config = loadConfig()!;
  }

  // Verify token still works (will refresh if needed)
  try {
    await ensureValidToken(config);
  } catch {
    console.log('Token invalid – starting re-authentication…');
    await firstRunSetup();
    config = loadConfig()!;
  }

  // QoL: offer auto-start on first successful run
  const alreadyAutoStart = await isAutoStartEnabled();
  if (!alreadyAutoStart && config.autoStart === false && process.platform === 'win32') {
    const answer = await prompt(
      'Would you like Lapse Notifier to start automatically with Windows? (y/N): ',
    );

    if (answer.toLowerCase() === 'y') {
      const ok = await enableAutoStart();
      updateConfig({ autoStart: true });
      console.log(ok ? '✓ Added to startup.' : '⚠ Could not add to startup (try running as admin).');
    }
  }

  const monitor = new LapseMonitor(config);
  monitor.start();

  console.log(
    `✓ Lapse Notifier is running. Checking every ${config.pollIntervalMinutes} min.\n` +
      `  Press Ctrl+C to stop.\n`,
  );

  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    monitor.stop();
    process.exit(0);
  });
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
