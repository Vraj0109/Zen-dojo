export type Session = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  admin: boolean;
  expiresAt: number;
  sessionId: string;
};

export type AccessTokenClaims = {
  iss: string;
  sub: string;
  sid: string;
  adm: boolean;
  iat: number;
  exp: number;
};
