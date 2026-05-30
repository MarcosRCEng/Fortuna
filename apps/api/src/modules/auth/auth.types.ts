export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  playerId: string;
  playerNickname?: string;
  sessionId: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: AuthenticatedUser;
}

export interface GoogleProfile {
  subject: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}
