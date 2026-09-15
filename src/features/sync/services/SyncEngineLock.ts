export class SyncEngineLock<Result = void> {
  private activeRun: Promise<Result> | undefined;

  run(processor: () => Promise<Result>): Promise<Result> {
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
