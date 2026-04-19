import { LapseStateListener } from './lapse/lapseStateListener';
import { StartLapseCommand } from './lapse/actions/startLapse';
import { ToastActionHandlers } from './lapse/actions/toastActionHandlers';
import { NotificationService } from './notifications/notificationService';
import { WindowsToastProvider } from './notifications/windowsToast';
import { PausedReminderScheduler } from './reminders/pausedReminderScheduler';
import { defaultReminderSettings, LapseStatus } from './types';

class InMemoryLapseStore {
  private readonly statuses = new Map<string, LapseStatus>();

  setStatus(lapseId: string, status: LapseStatus): void {
    this.statuses.set(lapseId, status);
  }

  async getStatus(lapseId: string): Promise<LapseStatus> {
    return this.statuses.get(lapseId) ?? 'stopped';
  }
}

class ConsoleStartLapseCommand implements StartLapseCommand {
  constructor(private readonly store: InMemoryLapseStore) {}

  async execute(lapseId: string): Promise<void> {
    this.store.setStatus(lapseId, 'active');
  }
}

export function createApp() {
  const store = new InMemoryLapseStore();
  const stateListener = new LapseStateListener();
  const toastProvider = new WindowsToastProvider();

  const scheduler = new PausedReminderScheduler({
    getStatus: (lapseId) => store.getStatus(lapseId),
    showReminder: async (lapseId) => {
      await notificationService.showPausedReminder(lapseId);
    },
    intervalMs: defaultReminderSettings.pausedReminderIntervalMinutes * 60 * 1000,
    dismissCooldownMs: defaultReminderSettings.dismissCooldownMinutes * 60 * 1000,
    enabled: defaultReminderSettings.pausedReminderEnabled,
  });

  const actions = new ToastActionHandlers(new ConsoleStartLapseCommand(store), scheduler);
  const notificationService = new NotificationService(toastProvider, {
    onStart: (lapseId) => actions.onStart(lapseId),
    onDismiss: (lapseId) => actions.onDismiss(lapseId),
  });

  stateListener.onLapsePaused((event) => {
    void scheduler.startPausedReminder(event.lapseId);
  });

  stateListener.onLapseUnpaused((event) => {
    scheduler.stopPausedReminder(event.lapseId);
  });

  return {
    updateLapseStatus(lapseId: string, status: LapseStatus): void {
      store.setStatus(lapseId, status);
      stateListener.updateStatus(lapseId, status);
    },
    handleToastAction(lapseId: string, action: 'start' | 'dismiss'): Promise<void> {
      return toastProvider.handleAction(lapseId, action);
    },
    dispose(): void {
      scheduler.dispose();
    },
  };
}
