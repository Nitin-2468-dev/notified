import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PausedReminderScheduler } from '../src/reminders/pausedReminderScheduler';

describe('PausedReminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts timer on paused and sends reminders', async () => {
    const showReminder = vi.fn(async () => undefined);
    const scheduler = new PausedReminderScheduler({
      getStatus: async () => 'paused',
      showReminder,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    expect(showReminder).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(showReminder).toHaveBeenCalledTimes(2);
  });

  it('does not create duplicate timers', async () => {
    const showReminder = vi.fn(async () => undefined);
    const scheduler = new PausedReminderScheduler({
      getStatus: async () => 'paused',
      showReminder,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    await scheduler.startPausedReminder('lapse-1');

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(showReminder).toHaveBeenCalledTimes(2);
  });

  it('stops reminder timer when lapse is not paused anymore', async () => {
    const showReminder = vi.fn(async () => undefined);
    let paused = true;

    const scheduler = new PausedReminderScheduler({
      getStatus: async () => (paused ? 'paused' : 'active'),
      showReminder,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    paused = false;

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(scheduler.hasTimer('lapse-1')).toBe(false);
  });

  it('respects dismiss cooldown', async () => {
    const showReminder = vi.fn(async () => undefined);

    const scheduler = new PausedReminderScheduler({
      getStatus: async () => 'paused',
      showReminder,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    scheduler.dismiss('lapse-1');

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(showReminder).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(showReminder).toHaveBeenCalledTimes(2);
  });
});
