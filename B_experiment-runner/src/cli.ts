import { Command } from "commander";

import { loadConfig } from "./config/loader.ts";
import { loadTestset } from "./testset/loader.ts";
import { executeExperiment } from "./runner/executor.ts";
import { backfillTraceAnalysis } from "./analyze/backfill.ts";
import { compareExperiments } from "./compare/compare.ts";
import { loadGradableRuns } from "./grade/loader.ts";
import { startGradeServer } from "./grade/server.ts";
import { runSqlChecks } from "./grade/sql-check.ts";
import { runGoldenSqlComparisons } from "./grade/golden-sql.ts";
import { persistSqlChecks, persistGoldenSqlResults } from "./grade/persist-checks.ts";
import { UserInputError, ConfigError } from "./errors.ts";

export function runCli(): void {
  const program = new Command();

  program
    .name("agent-runner")
    .description("Experiment runner for AI agent workflows")
    .version("2.0.0");

  program
    .command("run")
    .description("Run an experiment from a YAML config file")
    .requiredOption("-c, --config <path>", "Path to experiment config YAML")
    .option("--concurrency <n>", "Override concurrency level", parseInt)
    .option("--repetitions <n>", "Override repetitions per prompt", parseInt)
    .option("-v, --verbose", "Verbose output", false)
    .option("-q, --quiet", "Suppress non-error output", false)
    .action(async (opts) => {
      try {
        if (opts.verbose && opts.quiet) {
          throw new UserInputError("--verbose and --quiet cannot be used together.");
        }

        const config = await loadConfig(opts.config, {
          concurrency: opts.concurrency,
          repetitions: opts.repetitions,
        });

        const promptCases = await loadTestset(config.testset);

        const outcome = await executeExperiment({
          config,
          promptCases,
          verbose: opts.verbose,
          quiet: opts.quiet,
        });

        process.exitCode = outcome.hadFailures ? 1 : 0;
      } catch (error) {
        if (error instanceof UserInputError || error instanceof ConfigError) {
          console.error(`Error: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program
    .command("analyze")
    .description("Re-analyze traces for an existing experiment directory")
    .requiredOption("-d, --experiment-dir <path>", "Path to experiment invocation directory")
    .option("--database <url>", "PostgreSQL connection string override")
    .option("-v, --verbose", "Verbose output", false)
    .action(async (opts) => {
      try {
        await backfillTraceAnalysis({
          experimentDir: opts.experimentDir,
          verbose: opts.verbose,
          database: opts.database,
        });
      } catch (error) {
        if (error instanceof UserInputError || error instanceof ConfigError) {
          console.error(`Error: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program
    .command("compare")
    .description("Compare multiple experiment invocations")
    .option("-t, --target <selector...>", "Experiment selectors (experiment-name/{latest} or experiment-name/timestamp)")
    .option("-o, --out-dir <path>", "Output directory for comparison results")
    .option("-v, --verbose", "Verbose output", false)
    .option("-q, --quiet", "Suppress non-error output", false)
    .action(async (opts) => {
      try {
        if (opts.verbose && opts.quiet) {
          throw new UserInputError("--verbose and --quiet cannot be used together.");
        }

        if (!opts.target || opts.target.length === 0) {
          throw new UserInputError("Provide at least one --target selector.");
        }

        const outcome = await compareExperiments({
          targets: opts.target,
          outDir: opts.outDir,
          verbose: opts.verbose,
          quiet: opts.quiet,
        });

        if (!opts.quiet) {
          console.log(`Comparison output: ${outcome.outputRootDisplay}`);
          console.log(`Report: ${outcome.reportPath}`);
        }
      } catch (error) {
        if (error instanceof UserInputError || error instanceof ConfigError) {
          console.error(`Error: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program
    .command("grade")
    .description("Launch expert grading UI for an experiment invocation")
    .requiredOption("-t, --target <selector>", "Experiment selector (experiment-name/{latest} or experiment-name/timestamp)")
    .option("-p, --port <n>", "HTTP server port", parseInt, 3847)
    .option("--database <url>", "PostgreSQL connection string for SQL auto-checks")
    .option("--dev", "Start Vite dev server for UI hot-reload", false)
    .option("-v, --verbose", "Verbose output", false)
    .action(async (opts) => {
      try {
        const data = await loadGradableRuns(opts.target);
        const graded = data.runs.filter((r) => r.existingGrade).length;

        console.log(`Experiment: ${data.experimentName}`);
        console.log(`Invocation: ${data.invocationDir}`);
        console.log(`Runs: ${data.runs.length} total, ${graded} graded`);

        // Run SQL auto-checks if database URL provided
        if (opts.database) {
          console.log("");
          await runSqlChecks(data.runs, opts.database, (current, total) => {
            process.stdout.write(`\rChecking SQL ${current}/${total}...`);
          });
          process.stdout.write("\r");

          const checked = data.runs.filter((r) => r.sqlCheck !== null);
          const withErrors = checked.filter((r) => r.sqlCheck?.status === "error");
          console.log(`SQL checks: ${checked.length} checked, ${withErrors.length} with issues`);

          await persistSqlChecks(data.invocationPathAbs, data.experimentName, data.invocationDir, opts.database, data.runs);

          // Run golden SQL comparisons if golden SQL entries exist
          if (data.goldenSqlByCaseId.size > 0) {
            console.log("");
            await runGoldenSqlComparisons(
              data.runs,
              data.goldenSqlByCaseId,
              opts.database,
              (current, total) => {
                process.stdout.write(`\rComparing golden SQL ${current}/${total}...`);
              },
            );
            process.stdout.write("\r");

            const compared = data.runs.filter(
              (r) => r.goldenSqlComparison?.status === "match" || r.goldenSqlComparison?.status === "mismatch",
            );
            const matches = compared.filter((r) => r.goldenSqlComparison?.status === "match");
            const exPct = compared.length > 0 ? Math.round((matches.length / compared.length) * 100) : 0;
            console.log(`Golden SQL: ${compared.length} compared, ${matches.length} match (EX=${exPct}%)`);

            await persistGoldenSqlResults(data.invocationPathAbs, data.experimentName, data.invocationDir, opts.database, data.runs);
          }
        }

        const server = await startGradeServer({ data, port: opts.port, databaseUrl: opts.database, dev: opts.dev, verbose: opts.verbose });

        console.log(`\nGrading UI: http://localhost:${server.port}`);
        console.log("Press Ctrl+C to stop.\n");

        // Keep process alive until Ctrl+C
        process.on("SIGINT", () => {
          server.stop();
          process.exit(0);
        });
      } catch (error) {
        if (error instanceof UserInputError || error instanceof ConfigError) {
          console.error(`Error: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program.parse();
}
