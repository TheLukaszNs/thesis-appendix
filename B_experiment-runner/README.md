# agent-runner-2

CLI tool for running testset prompts against Mastra workflow endpoints, collecting results + artifacts, analyzing traces from Postgres for cost/latency/token metrics, and comparing experiments with Vega-Lite visualizations.

## Setup

```bash
bun install
```

All dependencies including Vega-Lite rendering (`vega-lite`, `vega`, `canvas`) are installed locally — no global installs needed.

## Usage

```bash
# Run an experiment
bun index.ts run --config config/example.yaml

# Re-analyze traces for an existing experiment
bun index.ts analyze --experiment-dir experiments/my-experiment/2026-02-21T...

# Compare two experiments
bun index.ts compare --target experiment-a/{latest} --target experiment-b/{latest}
```

### CLI flags

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to experiment YAML config |
| `--concurrency N` | Override concurrency from config |
| `--repetitions N` | Override repetitions from config |
| `-v, --verbose` | Per-run output lines, no progress bar |
| `-q, --quiet` | Only final summary and failure list |

## Project structure

See [CLAUDE.md](./CLAUDE.md) for full project structure, config format, and development conventions.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
