export const BATCH_DELAY_LIMITS = {
  minSeconds: 1,
  maxSeconds: 300
} as const;

export function formsPerMinuteToDelaySeconds(rate: number): number | null {
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return 60 / rate;
}

export function delaySecondsToFormsPerMinute(delaySeconds: number): number | null {
  if (!Number.isFinite(delaySeconds) || delaySeconds <= 0) {
    return null;
  }

  return 60 / delaySeconds;
}

export function clampDelaySeconds(delaySeconds: number): number {
  return Math.min(
    BATCH_DELAY_LIMITS.maxSeconds,
    Math.max(BATCH_DELAY_LIMITS.minSeconds, delaySeconds)
  );
}
