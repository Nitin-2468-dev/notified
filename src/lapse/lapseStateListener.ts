import { EventEmitter } from 'node:events';
import { LapseStatus } from '../types';

export interface LapsePausedEvent {
  lapseId: string;
}

export class LapseStateListener {
  private readonly statuses = new Map<string, LapseStatus>();
  private readonly emitter = new EventEmitter();

  updateStatus(lapseId: string, nextStatus: LapseStatus): void {
    const previousStatus = this.statuses.get(lapseId);
    this.statuses.set(lapseId, nextStatus);

    if (previousStatus !== 'paused' && nextStatus === 'paused') {
      this.emitter.emit('lapse.paused', { lapseId } satisfies LapsePausedEvent);
    }

    if (previousStatus === 'paused' && nextStatus !== 'paused') {
      this.emitter.emit('lapse.unpaused', { lapseId } satisfies LapsePausedEvent);
    }
  }

  onLapsePaused(handler: (event: LapsePausedEvent) => void): void {
    this.emitter.on('lapse.paused', handler);
  }

  onLapseUnpaused(handler: (event: LapsePausedEvent) => void): void {
    this.emitter.on('lapse.unpaused', handler);
  }
}
