export async function withRetries<T>(
  action: () => Promise<T>,
  attempts: number,
  onRetry?: (attempt: number, error: unknown) => Promise<void> | void
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await onRetry?.(attempt, error);
      }
    }
  }

  throw lastError;
}
