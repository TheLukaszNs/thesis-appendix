# Experiment Runner v2

**IMPORTANT: Keep this file up to date.** When adding features, changing structure, or making architectural decisions, update the relevant sections here so future sessions have accurate context.

CLI tool for running testset prompts against Mastra workflow endpoints, collecting results + artifacts, analyzing traces from Postgres for cost/latency/token metrics, comparing experiments with Vega-Lite visualizations, and expert grading with automated SQL checks.

## Runtime

Default to using **Bun** instead of Node.js.

- `bun <file>` instead of `node` / `ts-node`
- `bun test` instead of `jest` / `vitest`
- `bun install` instead of `npm install`
- `bunx` instead of `npx`
- Bun auto-loads `.env` — don't use `dotenv`
- `Bun.sql` for Postgres — don't use `pg`
- `Bun.file` / `Bun.write` for file I/O — don't use `node:fs` readFile/writeFile
- `Bun.$` for shell commands — don't use `execa`

## Project Structure

```
index.ts                        # Entry point → runCli()
src/
  cli.ts                        # Commander: run / analyze / compare / grade commands
  types.ts                      # All shared types
  errors.ts                     # UserInputError, ConfigError
  utils.ts                      # percentile, toUtcIso, isRecord, etc.

  config/
    schema.ts                   # ExperimentConfig validation
    loader.ts                   # Load YAML config, apply CLI overrides
    pricing.ts                  # Load model-pricing.json, lookup by model key

  testset/
    loader.ts                   # Load JSONL → PromptCase[] (supports optional golden_sql field)

  runner/
    executor.ts                 # Main orchestrator: build tasks → pool.map → summarize
    pool.ts                     # Semaphore-based TaskPool<T> with configurable concurrency
    task.ts                     # Single run: call API → parse → save artifacts → trace
    endpoint.ts                 # HTTP POST to Mastra start-async (with timeout)
    response.ts                 # Parse Mastra workflow response → ResultShape
    progress.ts                 # CLI progress bar (cli-progress)

  trace/
    store.ts                    # TraceSpanStore interface
    store-bun-sql.ts            # Bun.sql implementation
    analyzer.ts                 # Poll spans by traceId until usage populated
    extract.ts                  # Extract model/tokens from span attributes JSONB
    calc.ts                     # Aggregate per-model costs using pricing catalog
    report.ts                   # Build TraceCostReport + TraceAnalysisSummary

  artifacts/
    layout.ts                   # Create experiments/{name}/{timestamp}/runs/... dirs
    writer.ts                   # writeJson, writeText helpers (Bun.write)
    paths.ts                    # Convention: run.json, query.sql, vega.raw.json, viz.png

  viz/
    normalize.ts                # normalizeVegaSpec, resolveVegaSpecWithQueryData
    renderer.ts                 # vl2png CLI: spec.json → PNG (Bun.$)

  compare/
    compare.ts                  # Orchestrator: load → metrics → plots → report
    loader.ts                   # Resolve experiment selectors, load run.json + grading files
    metrics.ts                  # pass@1, pass@k, latency stats, cost stats, Wilson CI
    grading-metrics.ts          # Human eval, EX accuracy, SQL validity, combined quality metrics
    plots.ts                    # Vega-Lite spec builders for comparison charts
    grading-plots.ts            # Grading Vega-Lite plots (scores, issues, EX, heatmap, quality-vs-cost)
    report.ts                   # Markdown comparison report (incl. grading sections)

  grade/
    types.ts                    # GradeEntry, IssueTag, ISSUE_CATALOG, SqlCheckResult, GoldenSqlComparison, GradableRun, SqlChecksFile, GoldenSqlResultsFile
    loader.ts                   # Load runs for grading, extract rowCount, load golden SQL from testset
    store.ts                    # Load/save grades.json (v2 schema, backwards-compatible with v1)
    persist-checks.ts           # Persist sql-checks.json and golden-sql-results.json to invocation dir
    server.ts                   # Bun HTTP server: API + dev proxy (Vite) / prod static serving
    sql-check.ts                # Auto SQL checks via EXPLAIN (invalid_table/column, syntax_error, zero_rows)
    golden-sql.ts               # Golden SQL execution accuracy (EX): compare predicted vs golden results
    golden-sql.test.ts          # Unit tests for compareResultSets
    ui/
      index.html                # Vite HTML entry point
      index.tsx                 # React entrypoint (createRoot, imports styles.css)
      App.tsx                   # Top-level state, layout (Sidebar + RunDetail)
      Sidebar.tsx               # Header, progress, filter, scrollable run list
      RunDetail.tsx             # Prompt, SQL, visualization, grade form
      GradeForm.tsx             # Score buttons, IssueChecklist, note, save
      IssueChecklist.tsx        # Issue chips grouped by category, auto badges
      SqlCheckBanner.tsx        # OK/error/skipped banner for EXPLAIN checks
      GoldenSqlBanner.tsx       # EX pass/fail/error banner for golden SQL comparison
      useKeyboardShortcuts.ts   # Keyboard handler (1-5, Enter, j/k/n)
      api.ts                    # Fetch helpers (runs, sql, grade, info)
      styles.css                # Tailwind v4 imports + shadcn zinc theme CSS variables
      lib/utils.ts              # cn() helper (clsx + tailwind-merge)
      components/ui/            # shadcn/ui components (managed via CLI)
        button, badge, card, select, textarea, scroll-area, alert, toggle

  analyze/
    backfill.ts                 # Standalone: re-analyze traces for existing experiment

components.json                 # shadcn/ui config (aliases, CSS path, base color)
vite.config.ts                  # Vite config: root=src/grade/ui, Tailwind + React plugins, @ alias

config/
  model-pricing.json            # Pricing catalog
  example.yaml                  # Example experiment config

testsets/
  example.jsonl                 # Example testset
```

## CLI Commands

```sh
bun index.ts run     --config <path.yaml> [--concurrency N] [--repetitions N] [-v] [-q]
bun index.ts analyze --experiment-dir <path> [--database <url>] [-v]
bun index.ts compare --target <selector> --target <selector> [-o <path>] [-v] [-q]
bun index.ts grade   --target <selector> [--port 3847] [--database <url>] [--dev] [-v]
```

Target selector format: `experiment-name/{latest}` or `experiment-name/2026-02-21T...`

## Experiment Config (YAML)

Configs live in `config/`. See `config/example.yaml` for the full format.

Key sections: `api` (baseUrl, workflowId, model, timeoutMs), `testset`, `execution` (repetitions, concurrency), `trace` (enabled, database, poll settings), `output` (dir), `metadata` (condition, hypothesis, tags).

## Mastra API

`POST http://localhost:4111/api/workflows/{workflowId}/start-async` — synchronous JSON response with `traceId`, `result` (sql, data, visualization, quality), and `steps`.

## Trace DB

`postgresql://postgres:postgres@localhost:5433/mastra` — `mastra_ai_spans` table, filter by `spanType = 'model_generation'`, attributes JSONB has `model`, `usage.inputTokens`, `usage.outputTokens`.

## Grading

The `grade` command launches a local web UI for expert grading of experiment runs.

- **UI build**: Uses Vite (config at `vite.config.ts`, root `src/grade/ui`). Build with `bunx vite build` → `dist/grade-ui/`.
- **Prod mode** (default): Bun serves pre-built static files from `dist/grade-ui/`. Requires `bunx vite build` first.
- **Dev mode** (`--dev`): Bun spawns a Vite dev server on port 5199 and proxies non-API requests to it. HMR WebSocket connects directly to Vite on port 5199.
- **Score**: 1-5 readability scale (Broken → Excellent)
- **Issue checklist**: 19 toggleable issue tags across 5 categories (SQL Structural, SQL Semantic, Visualization Type, Visualization Readability, Integration)
- **Auto SQL checks**: When `--database <url>` is provided, runs `EXPLAIN` against all SQL files on startup. Auto-detected issues (invalid_table, invalid_column, syntax_error, zero_rows) are pre-checked with "auto" badge in UI.
- **Golden SQL / Execution Accuracy (EX)**: When testset entries include an optional `golden_sql` field and `--database` is provided, executes both golden and predicted SQL, compares result sets (column-normalized, order-independent, float-epsilon). Auto-tags `result_mismatch` on mismatch. Shows EX pass/fail banner in UI and EX badges/stats in sidebar.
- **Persisted check results**: When `--database` is provided, SQL check results are saved to `sql-checks.json` and golden SQL results to `golden-sql-results.json` in the invocation dir. These are consumed by the `compare` command for grading metrics without requiring `--database`.
- **Grades file**: `grades.json` in invocation dir, schema v2 (backwards-compatible with v1 — missing `issues` field backfilled as `[]`)

## Artifact Output Layout

```
experiments/{name}/{timestamp}/
  manifest.json
  summary.json
  trace-cost-report.json
  grades.json
  sql-checks.json
  golden-sql-results.json
  config.yaml
  runs/{case-id}/run-0001/
    run.json, query.sql, vega.raw.json, vega.resolved.json, viz.png
```

## Dependencies

- `commander` — CLI parsing
- `cli-progress` — progress bar
- `yaml` — YAML config parsing
- `Bun.sql` — Postgres (no `pg`)
- `vega-lite`, `vega`, `canvas` — Vega-Lite → PNG rendering (local install, invoked via `bunx vl2png`)
- `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` — Grading UI dev server + production build
- Tailwind CSS v4 — utility-first styling (via `@tailwindcss/vite` plugin, no config file needed)
- shadcn/ui — managed via `bunx shadcn@latest` CLI. Config in `components.json` (aliases point `@` → `src/grade/ui`). Add new components: `bunx shadcn@latest add <component>`
- `radix-ui` — Radix UI primitives (unified package, used by shadcn components)
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn component utilities
- `lucide-react` — icon library (shadcn default)

## Testing

```ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(1).toBe(1);
});
```

Run with `bun test`.
