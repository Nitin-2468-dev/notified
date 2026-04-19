import { describe, expect, it, vi } from 'vitest';
import { PausedReminderScheduler } from '../src/reminders/pausedReminderScheduler';
import { ToastActionHandlers } from '../src/lapse/actions/toastActionHandlers';

describe('ToastActionHandlers', () => {
  it('Start calls resume command and stops scheduler', async () => {
    const startCommand = { execute: vi.fn(async () => undefined) };
    const scheduler = new PausedReminderScheduler({
      getStatus: async () => 'paused',
      showReminder: async () => undefined,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    const handlers = new ToastActionHandlers(startCommand, scheduler);

    await handlers.onStart('lapse-1');

    expect(startCommand.execute).toHaveBeenCalledWith('lapse-1');
    expect(scheduler.hasTimer('lapse-1')).toBe(false);
  });

  it('Dismiss sets cooldown and suppresses next tick', async () => {
    vi.useFakeTimers();

    const showReminder = vi.fn(async () => undefined);
    const scheduler = new PausedReminderScheduler({
      getStatus: async () => 'paused',
      showReminder,
      intervalMs: 5 * 60 * 1000,
      dismissCooldownMs: 10 * 60 * 1000,
    });

    await scheduler.startPausedReminder('lapse-1');
    const handlers = new ToastActionHandlers({ execute: async () => undefined }, scheduler);

    await handlers.onDismiss('lapse-1');

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(showReminder).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
