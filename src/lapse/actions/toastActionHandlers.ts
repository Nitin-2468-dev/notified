import { StartLapseCommand } from './startLapse';
import { PausedReminderScheduler } from '../../reminders/pausedReminderScheduler';

export class ToastActionHandlers {
  private readonly startInFlight = new Set<string>();

  constructor(
    private readonly startLapseCommand: StartLapseCommand,
    private readonly scheduler: PausedReminderScheduler,
  ) {}

  async onStart(lapseId: string): Promise<void> {
    if (this.startInFlight.has(lapseId)) {
      return;
    }

    this.startInFlight.add(lapseId);
    try {
      await this.startLapseCommand.execute(lapseId);
      this.scheduler.stopPausedReminder(lapseId);
    } finally {
      this.startInFlight.delete(lapseId);
    }
  }

  async onDismiss(lapseId: string): Promise<void> {
    this.scheduler.dismiss(lapseId);
  }
}
