export class TaskPool<T> {
  private readonly concurrency: number;
  private running = 0;
  private waiters: Array<() => void> = [];
  private shuttingDown = false;

  constructor(concurrency: number) {
    this.concurrency = Math.max(1, concurrency);
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running += 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.running -= 1;
    }
  }

  shutdown(): void {
    this.shuttingDown = true;
  }

  async map<U>(
    tasks: T[],
    fn: (task: T, index: number) => Promise<U>,
  ): Promise<U[]> {
    const results: U[] = new Array(tasks.length);

    const execute = async (task: T, index: number): Promise<void> => {
      if (this.shuttingDown) {
        throw new Error("TaskPool is shutting down.");
      }

      await this.acquire();

      try {
        results[index] = await fn(task, index);
      } finally {
        this.release();
      }
    };

    await Promise.all(tasks.map((task, index) => execute(task, index)));
    return results;
  }
}
