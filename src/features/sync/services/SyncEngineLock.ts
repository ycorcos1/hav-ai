export class SyncEngineLock {
  private activeRun: Promise<void> | undefined;

  run(processor: () => Promise<void>): Promise<void> {
    if (this.activeRun) return this.activeRun;

    const run = Promise.resolve()
      .then(processor)
      .finally(() => {
        if (this.activeRun === run) this.activeRun = undefined;
      });
    this.activeRun = run;
    return run;
  }

  isRunning(): boolean {
    return this.activeRun !== undefined;
  }
}
