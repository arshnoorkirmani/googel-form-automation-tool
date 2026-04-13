type QueueTask = () => Promise<void>;

declare global {
  // eslint-disable-next-line no-var
  var __runQueue__: RunQueue | undefined;
}

class RunQueue {
  private readonly queue: QueueTask[] = [];
  private processing = false;

  enqueue(task: QueueTask): void {
    this.queue.push(task);
    void this.process();
  }

  getState(): { processing: boolean; queued: number } {
    return {
      processing: this.processing,
      queued: this.queue.length
    };
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const nextTask = this.queue.shift();

        if (!nextTask) {
          continue;
        }

        try {
          await nextTask();
        } catch {
          // Individual task errors are handled by the runner and should not stop the queue.
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

export const runQueue =
  globalThis.__runQueue__ ?? (globalThis.__runQueue__ = new RunQueue());
