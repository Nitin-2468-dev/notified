import { EventEmitter } from 'node:events';
import {
  NotificationAction,
  NotificationActionEvent,
  NotificationActionHandler,
  NotificationProvider,
  ShowPausedToastInput,
} from './notificationProvider';

type ToastShownEvent = ShowPausedToastInput & { notificationId: string };

export class WindowsToastProvider implements NotificationProvider {
  private readonly emitter = new EventEmitter();
  private actionHandler: NotificationActionHandler | null = null;

  setActionHandler(handler: NotificationActionHandler): void {
    this.actionHandler = handler;
  }

  async showPausedToast(input: ShowPausedToastInput): Promise<string> {
    const notificationId = `${input.lapseId}-${Date.now()}`;
    this.emitter.emit('shown', { ...input, notificationId } satisfies ToastShownEvent);
    return notificationId;
  }

  async clear(notificationId: string): Promise<void> {
    this.emitter.emit('cleared', notificationId);
  }

  onShown(listener: (event: ToastShownEvent) => void): void {
    this.emitter.on('shown', listener);
  }

  onCleared(listener: (notificationId: string) => void): void {
    this.emitter.on('cleared', listener);
  }

  async handleAction(lapseId: string, action: NotificationAction): Promise<void> {
    if (!this.actionHandler) {
      return;
    }

    const event: NotificationActionEvent = { lapseId, action };
    await this.actionHandler(event);
  }
}
