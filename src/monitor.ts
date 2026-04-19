import { getDraftTimelapses, getCurrentUser } from './lapseClient.js';
import { showNotification, openLapse } from './notifier.js';
import { ensureValidToken } from './auth.js';
import type { AppConfig } from './types.js';
import { loadConfig } from './config.js';

export interface MonitorState {
  hasActiveLapse: boolean;
  lastNotifiedAt: number;
  dismissedUntil: number;
  userId: string | null;
}

function initialState(): MonitorState {
  return {
    hasActiveLapse: false,
    lastNotifiedAt: 0,
    dismissedUntil: 0,
    userId: null,
  };
}

export class LapseMonitor {
  private state: MonitorState = initialState();
  private timer: NodeJS.Timeout | null = null;

  constructor(private config: AppConfig) {}

  /** Starts the polling loop. */
  start(): void {
    if (this.timer) {
      return;
    }

    void this.pollOnce(); // run immediately then on interval
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, this.config.pollIntervalMinutes * 60 * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  dismiss(): void {
    this.state.dismissedUntil =
      Date.now() + this.config.dismissCooldownMinutes * 60 * 1000;
  }

  /** Refreshes config from disk (e.g. after user edits config.json). */
  reloadConfig(): void {
    const fresh = loadConfig();
    if (fresh) {
      this.config = fresh;
    }
  }

  /** Runs a single poll cycle. Exposed for testing. */
  async pollOnce(): Promise<void> {
    return this.poll();
  }

  private async poll(): Promise<void> {
    try {
      const config = this.config;
      const token = await ensureValidToken(config);

      // Resolve user ID once and cache it
      if (!this.state.userId) {
        const user = await getCurrentUser(token);
        this.state.userId = user.id;
      }

      const drafts = await getDraftTimelapses(token, this.state.userId);
      const wasActive = this.state.hasActiveLapse;
      this.state.hasActiveLapse = drafts.length > 0;

      if (!this.state.hasActiveLapse) {
        // No active lapse – nothing to do
        return;
      }

      const now = Date.now();

      // Respect dismiss cooldown
      if (now < this.state.dismissedUntil) {
        return;
      }

      // Guard against duplicate notifications within the same interval
      if (
        this.state.lastNotifiedAt > 0 &&
        now - this.state.lastNotifiedAt < this.config.pollIntervalMinutes * 60 * 1000
      ) {
        return;
      }

      this.state.lastNotifiedAt = now;

      const name = drafts[0]?.name ? `"${drafts[0].name}"` : 'a session';
      const title = wasActive ? 'Lapse is still running' : 'Lapse session started';
      const message = wasActive
        ? `You have an active timelapse (${name}). Click to open.`
        : `A new timelapse (${name}) has started. Click to open.`;

      showNotification({
        title,
        message,
        onOpen: () => openLapse(),
        onDismiss: () => this.dismiss(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[notified] poll error: ${message}`);
    }
  }
}
