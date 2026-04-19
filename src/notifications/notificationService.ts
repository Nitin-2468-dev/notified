import {
  NotificationActionEvent,
  NotificationProvider,
} from './notificationProvider';

export interface NotificationActions {
  onStart(lapseId: string): Promise<void>;
  onDismiss(lapseId: string): Promise<void>;
}

export class NotificationService {
  constructor(
    private readonly provider: NotificationProvider,
    private readonly actions: NotificationActions,
  ) {
    this.provider.setActionHandler(async (event) => {
      await this.routeAction(event);
    });
  }

  async showPausedReminder(lapseId: string): Promise<string | undefined> {
    return this.provider.showPausedToast({
      lapseId,
      title: 'Lapse is paused',
      body: 'Your lapse is still paused.',
    });
  }

  private async routeAction(event: NotificationActionEvent): Promise<void> {
    if (event.action === 'start') {
      await this.actions.onStart(event.lapseId);
      return;
    }

    await this.actions.onDismiss(event.lapseId);
  }
}
