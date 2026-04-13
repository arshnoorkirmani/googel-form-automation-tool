export function createRunId(prefix = "run"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}_${timestamp}_${crypto.randomUUID().slice(0, 8)}`;
}
