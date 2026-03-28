import * as cliProgress from "cli-progress";

export interface ProgressReporter {
  enabled: boolean;
  tick: (params: {
    completedRuns: number;
    plannedRuns: number;
    successRuns: number;
    failedRuns: number;
  }) => void;
  log: (message: string) => void;
  stop: () => void;
}

export function createProgressReporter(opts: {
  quiet: boolean;
  verbose: boolean;
}): ProgressReporter {
  const enabled = !opts.quiet && !opts.verbose && Boolean(process.stdout.isTTY);
  if (!enabled) {
    return {
      enabled: false,
      tick: () => {},
      log: () => {},
      stop: () => {},
    };
  }

  const bar = new cliProgress.SingleBar({
    format: "[{bar}] {percentage}% | {value}/{total} | {ok} ok, {failed} failed",
    barsize: 28,
    barCompleteChar: "#",
    barIncompleteChar: ".",
    stopOnComplete: false,
    clearOnComplete: false,
    hideCursor: true,
    stream: process.stdout,
  });

  let started = false;
  let trackedTotal = 0;
  let currentValue = 0;
  let currentPayload: { ok: number; failed: number } = { ok: 0, failed: 0 };

  return {
    enabled,
    tick: (params) => {
      const total = params.plannedRuns > 0 ? params.plannedRuns : 1;
      const payload = { ok: params.successRuns, failed: params.failedRuns };
      currentValue = params.completedRuns;
      currentPayload = payload;

      if (!started) {
        bar.start(total, params.completedRuns, payload);
        started = true;
        trackedTotal = total;
        return;
      }

      if (trackedTotal !== total) {
        bar.setTotal(total);
        trackedTotal = total;
      }

      bar.update(params.completedRuns, payload);
    },
    log: (message: string) => {
      if (!started) {
        process.stdout.write(message + "\n");
        return;
      }
      // Clear the bar line, print the message, then re-render the bar
      process.stdout.write("\r\x1b[K");
      process.stdout.write(message + "\n");
      bar.update(currentValue, currentPayload);
    },
    stop: () => {
      if (!started) return;
      bar.stop();
      started = false;
      trackedTotal = 0;
    },
  };
}
