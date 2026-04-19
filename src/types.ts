export interface DraftTimelapse {
  id: string;
  name?: string;
  description: string;
  createdAt: number;
}

export interface LapseUser {
  id: string;
  displayName: string;
  handle: string;
  profilePictureUrl: string;
}

export interface AppConfig {
  clientId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  pollIntervalMinutes: number;
  dismissCooldownMinutes: number;
  autoStart: boolean;
}

export const DEFAULT_CONFIG: Omit<AppConfig, 'clientId'> = {
  pollIntervalMinutes: 5,
  dismissCooldownMinutes: 10,
  autoStart: false,
};
