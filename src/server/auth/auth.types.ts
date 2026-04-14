export type AuthSessionState =
  | "MISSING"
  | "VALID"
  | "REAUTH_REQUIRED"
  | "FORBIDDEN";

export type AuthMetadata = {
  state: AuthSessionState;
  savedAt?: string;
  lastValidatedAt?: string;
  detectedEmail?: string;
  reason?: string;
};

export type AuthStatus = {
  state: AuthSessionState | "SETUP_IN_PROGRESS";
  detectedEmail?: string;
  savedAt?: string;
  lastValidatedAt?: string;
  reason?: string;
  sessionStorageLocation: string;
};
