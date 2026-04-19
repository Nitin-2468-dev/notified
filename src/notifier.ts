// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeNotifier = require('node-notifier') as {
  notify: (
    opts: Record<string, unknown>,
    cb?: (err: Error | null, response: string, metadata: unknown) => void,
  ) => void;
};

const LAPSE_URL = 'https://lapse.hackclub.com';

export interface NotifyOptions {
  title: string;
  message: string;
  /** Called when user clicks the notification body or "Open Lapse" action. */
  onOpen?: () => void;
  /** Called when the user activates the "Dismiss" action or closes the notification. */
  onDismiss?: () => void;
}

export function showNotification(opts: NotifyOptions): void {
  nodeNotifier.notify(
    {
      title: opts.title,
      message: opts.message,
      sound: false,
      wait: true,
      actions: ['Open Lapse', 'Dismiss'],
    },
    (_err, response, metadata) => {
      const action =
        metadata && typeof metadata === 'object' && 'activationValue' in (metadata as object)
          ? String((metadata as Record<string, unknown>)['activationValue'])
          : response;

      if (action === 'Dismiss' || response === 'dismissed' || response === 'timeout') {
        opts.onDismiss?.();
        return;
      }

      opts.onOpen?.();
    },
  );
}

export function openLapse(): void {
  // Dynamic import to avoid needing ESM open in a CJS context at require-time
  import('open')
    .then(({ default: open }) => open(LAPSE_URL))
    .catch(() => {
      // Silently ignore – the URL couldn't be opened
    });
}
