export type NotificationAction = 'start' | 'dismiss';

export interface NotificationActionEvent {
  lapseId: string;
  action: NotificationAction;
}

export interface ShowPausedToastInput {
  lapseId: string;
  title: string;
  body: string;
}

export type NotificationActionHandler = (event: NotificationActionEvent) => Promise<void> | void;

export interface NotificationProvider {
  setActionHandler(handler: NotificationActionHandler): void;
  showPausedToast(input: ShowPausedToastInput): Promise<string | undefined>;
  clear(notificationId: string): Promise<void>;
}
