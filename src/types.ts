export type LapseStatus = 'active' | 'paused' | 'stopped';

export interface ReminderSettings {
  pausedReminderEnabled: boolean;
  pausedReminderIntervalMinutes: number;
  dismissCooldownMinutes: number;
}

export const defaultReminderSettings: ReminderSettings = {
  pausedReminderEnabled: true,
  pausedReminderIntervalMinutes: 5,
  dismissCooldownMinutes: 10,
};
