export interface StartLapseCommand {
  execute(lapseId: string): Promise<void>;
}
