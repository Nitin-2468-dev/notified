import type { DraftTimelapse, LapseUser } from './types.js';

const API_URL = 'https://api.lapse.hackclub.com';

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Lapse API error (${path}): HTTP ${res.status}`);
  }

  const body = (await res.json()) as { data?: T; output?: T };
  // oRPC wraps responses – try common envelope shapes
  return (body as { data: T }).data ?? (body as { output: T }).output ?? (body as unknown as T);
}

export async function getCurrentUser(token: string): Promise<LapseUser> {
  const body = await apiFetch<{ user: LapseUser }>('/user/myself', token);
  return body.user;
}

export async function getDraftTimelapses(
  token: string,
  userId: string,
): Promise<DraftTimelapse[]> {
  const body = await apiFetch<{ timelapses: DraftTimelapse[] }>(
    `/draftTimelapse/findByUser?user=${encodeURIComponent(userId)}`,
    token,
  );
  return body.timelapses ?? [];
}
