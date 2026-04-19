import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LapseMonitor } from '../src/monitor';
import type { AppConfig } from '../src/types';
import type { DraftTimelapse } from '../src/types';

// ──────────────────────────────────────────────────────────────────────────
// Module mocks (hoisted before imports via vi.mock)
// ──────────────────────────────────────────────────────────────────────────

vi.mock('../src/auth', () => ({
  ensureValidToken: vi.fn(async () => 'mock-token'),
}));

vi.mock('../src/config', () => ({
  loadConfig: vi.fn(() => null),
}));

const mockGetDraftTimelapses = vi.fn<() => Promise<DraftTimelapse[]>>(async () => []);
const mockGetCurrentUser = vi.fn(async () => ({
  id: 'user-1',
  displayName: 'Test',
  handle: 'test',
  profilePictureUrl: '',
}));

vi.mock('../src/lapseClient', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getDraftTimelapses: (...args: unknown[]) => mockGetDraftTimelapses(...args),
}));

const mockShowNotification = vi.fn();
vi.mock('../src/notifier', () => ({
  showNotification: (...args: unknown[]) => mockShowNotification(...args),
  openLapse: () => undefined,
}));

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    clientId: 'test-client',
    accessToken: 'tok',
    pollIntervalMinutes: 5,
    dismissCooldownMinutes: 10,
    autoStart: false,
    ...overrides,
  };
}

function makeDraft(id = 'draft-1'): DraftTimelapse {
  return { id, name: 'My Session', description: '', createdAt: Date.now() };
}

// ──────────────────────────────────────────────────────────────────────────
// Tests (call pollOnce() directly – no fake timer complexity)
// ──────────────────────────────────────────────────────────────────────────

describe('LapseMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no draft timelapses exist', async () => {
    mockGetDraftTimelapses.mockResolvedValue([]);
    const monitor = new LapseMonitor(makeConfig());

    await monitor.pollOnce();

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('shows a notification when a draft timelapse is present', async () => {
    mockGetDraftTimelapses.mockResolvedValue([makeDraft()]);
    const monitor = new LapseMonitor(makeConfig());

    await monitor.pollOnce();

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  it('does not notify twice within the same poll interval', async () => {
    mockGetDraftTimelapses.mockResolvedValue([makeDraft()]);
    const monitor = new LapseMonitor(makeConfig({ pollIntervalMinutes: 5 }));

    await monitor.pollOnce();
    await monitor.pollOnce(); // second call within the same interval window

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  it('respects dismiss cooldown – skips poll when dismissed', async () => {
    mockGetDraftTimelapses.mockResolvedValue([makeDraft()]);
    const monitor = new LapseMonitor(makeConfig());

    await monitor.pollOnce(); // notified
    monitor.dismiss();        // user clicked dismiss

    await monitor.pollOnce(); // should be suppressed

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  it('notifies again after dismiss cooldown expires', async () => {
    vi.useFakeTimers();
    mockGetDraftTimelapses.mockResolvedValue([makeDraft()]);
    const monitor = new LapseMonitor(makeConfig({ pollIntervalMinutes: 5, dismissCooldownMinutes: 10 }));

    await monitor.pollOnce();   // first notification
    monitor.dismiss();

    await monitor.pollOnce();   // still in cooldown – suppressed
    expect(mockShowNotification).toHaveBeenCalledTimes(1);

    // Advance past dismiss cooldown (10 min) + one poll interval (5 min) = 15 min
    vi.advanceTimersByTime(15 * 60 * 1000);
    await monitor.pollOnce();   // cooldown expired – should notify again
    expect(mockShowNotification).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('start() is idempotent – does not create duplicate timers', () => {
    vi.useFakeTimers();
    const monitor = new LapseMonitor(makeConfig());
    monitor.start();
    monitor.start(); // second call should be a no-op
    monitor.stop();
    vi.useRealTimers();
  });

  it('stop() is idempotent', () => {
    const monitor = new LapseMonitor(makeConfig());
    monitor.stop(); // stop before start should not throw
    monitor.start();
    monitor.stop();
    monitor.stop(); // second stop should not throw
  });
});
