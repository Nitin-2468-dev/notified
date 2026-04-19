import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { AppConfig } from './types.js';
import { updateConfig } from './config.js';

const API_URL = 'https://api.lapse.hackclub.com';
const CALLBACK_PORT = 9737;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
const SCOPES = 'timelapse:read user:read';

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('hex');
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(clientId: string, state: string, challenge: string): string {
  const url = new URL(`${API_URL}/api/auth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.href;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
  verifier: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: HTTP ${res.status} – ${await res.text()}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: HTTP ${res.status} – ${await res.text()}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Runs the OAuth2 PKCE browser flow. Returns the tokens once the user completes auth.
 * The caller is responsible for opening the authorise URL (via `openBrowser`).
 */
export function runCallbackServer(
  clientId: string,
  clientSecret: string,
  openBrowser: (url: string) => Promise<void>,
): Promise<TokenResponse> {
  return new Promise<TokenResponse>((resolve, reject) => {
    const state = randomBytes(16).toString('hex');
    const { verifier, challenge } = generatePkce();
    const authorizeUrl = buildAuthorizeUrl(clientId, state, challenge);

    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://localhost:${CALLBACK_PORT}`);

        if (url.pathname !== '/callback') {
          res.writeHead(404).end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' }).end(
            `<p style="font-family:sans-serif;color:red">Auth error: ${error}. You can close this tab.</p>`,
          );
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' }).end(
            '<p style="font-family:sans-serif;color:red">Bad callback. You can close this tab.</p>',
          );
          server.close();
          reject(new Error('Bad OAuth callback: missing code or state mismatch'));
          return;
        }

        try {
          const tokens = await exchangeCode(clientId, clientSecret, code, verifier);
          res.writeHead(200, { 'Content-Type': 'text/html' }).end(
            `<p style="font-family:sans-serif;color:green">
              ✓ Signed in to Lapse Notifier! You can close this tab.
            </p>`,
          );
          server.close();
          resolve(tokens);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' }).end(
            `<p style="font-family:sans-serif;color:red">Token exchange failed. You can close this tab.</p>`,
          );
          server.close();
          reject(err);
        }
      },
    );

    server.listen(CALLBACK_PORT, () => {
      openBrowser(authorizeUrl).catch(reject);
    });

    server.on('error', (err) => {
      reject(new Error(`Callback server error: ${err.message}`));
    });
  });
}

/**
 * Ensures a valid access token is in the config, refreshing if necessary.
 * Returns the current valid access token.
 */
export async function ensureValidToken(config: AppConfig): Promise<string> {
  const now = Date.now();
  const bufferMs = 60 * 1000; // refresh 60 s before expiry

  if (
    config.accessToken &&
    (!config.tokenExpiresAt || config.tokenExpiresAt - bufferMs > now)
  ) {
    return config.accessToken;
  }

  if (!config.refreshToken) {
    throw new Error('No refresh token available – re-authentication required.');
  }

  const clientSecret = process.env['LAPSE_CLIENT_SECRET'];
  if (!clientSecret) {
    throw new Error(
      'LAPSE_CLIENT_SECRET environment variable is not set. ' +
        'Set it before running: LAPSE_CLIENT_SECRET=<secret> node dist/main.js',
    );
  }
  const tokens = await refreshAccessToken(config.clientId, clientSecret, config.refreshToken);
  const updatedConfig = updateConfig({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? config.refreshToken,
    tokenExpiresAt: tokens.expires_in ? now + tokens.expires_in * 1000 : undefined,
  });

  return updatedConfig.accessToken!;
}
