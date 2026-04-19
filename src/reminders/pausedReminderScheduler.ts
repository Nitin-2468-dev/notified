import { LapseStatus } from '../types';

export interface PausedReminderSchedulerDependencies {
  getStatus(lapseId: string): Promise<LapseStatus>;
  showReminder(lapseId: string): Promise<void>;
  intervalMs: number;
  dismissCooldownMs: number;
  enabled?: boolean;
}

export class PausedReminderScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly dismissedUntil = new Map<string, number>();
  private readonly lastNotifiedAt = new Map<string, number>();
  private readonly enabled: boolean;

  constructor(private readonly deps: PausedReminderSchedulerDependencies) {
    this.enabled = deps.enabled ?? true;
  }

  async startPausedReminder(lapseId: string): Promise<void> {
    if (!this.enabled || this.timers.has(lapseId)) {
      return;
    }

    await this.tick(lapseId);
    const timer = setInterval(() => {
      void this.tick(lapseId);
    }, this.deps.intervalMs);

    this.timers.set(lapseId, timer);
  }

  stopPausedReminder(lapseId: string): void {
    const timer = this.timers.get(lapseId);
    if (!timer) {
      return;
    }

    clearInterval(timer);
    this.timers.delete(lapseId);
  }

  dismiss(lapseId: string): void {
    this.dismissedUntil.set(lapseId, Date.now() + this.deps.dismissCooldownMs);
  }

  hasTimer(lapseId: string): boolean {
    return this.timers.has(lapseId);
  }

  dispose(): void {
    for (const lapseId of this.timers.keys()) {
      this.stopPausedReminder(lapseId);
    }
  }

  private async tick(lapseId: string): Promise<void> {
    const status = await this.deps.getStatus(lapseId);
    if (status !== 'paused') {
      this.stopPausedReminder(lapseId);
      return;
    }

    const now = Date.now();
    const cooldownUntil = this.dismissedUntil.get(lapseId) ?? 0;
    if (now < cooldownUntil) {
      return;
    }

    const lastNotifiedAt = this.lastNotifiedAt.get(lapseId) ?? 0;
    if (lastNotifiedAt > 0 && now - lastNotifiedAt < this.deps.intervalMs) {
      return;
    }

    await this.deps.showReminder(lapseId);
    this.lastNotifiedAt.set(lapseId, now);
  }
}
