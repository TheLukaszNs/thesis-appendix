# Appendix: Digital Supplementary Materials

This appendix contains the full source code and experimental data produced as part of the master thesis. The materials are organised into two self-contained directories, each corresponding to a distinct component of the implemented system.

---

## Directory Structure

```
appendix/
├── README.md                    ← this file
├── A_workflow-system/           ← Mastra workflow/agent implementation (src/mastra/)
└── B_experiment-runner/         ← the evaluation and experiment tooling
```

---

## A — Mastra Workflows (`A_workflow-system/`)

The Mastra implementation of the NL-to-SQL system: workflow definitions, agents, tools, and supporting modules. This is the core of the system evaluated in the thesis — it accepts natural-language questions, generates SQL, executes it against a PostgreSQL database, and produces Vega-Lite visualisation specs.

**Framework:** Mastra 1.2, AI SDK, PostgreSQL, Vega-Lite.

### Workflows

| File | Workflow ID | Description |
|---|---|---|
| `workflows/simple.workflow.ts` | `simpleWorkflow` | Single-step: model generates SQL → execute → visualise |
| `workflows/agent.workflow.ts` | `agentWorkflow` | Agent generates SQL and visualisation spec in one shot |
| `workflows/complex.workflow.ts` | `complexWorkflow` | Planner + iterative SQL→validate loop (up to 3 attempts) |
| `workflows/rag.workflow.ts` | `ragWorkflow` | RAG-augmented variant |

### Agents

| File | Role |
|---|---|
| `agents/sql.agent.ts` | Primary SQL generation agent |
| `agents/one-shot.agent.ts` | One-shot SQL + visualisation agent |
| `agents/planner.agent.ts` | Query planner (used by complexWorkflow) |
| `agents/validator.agent.ts` | SQL validation step |
| `agents/intent-parser.agent.ts` | Natural-language intent parsing |
| `agents/viz.agent.ts` | Vega-Lite spec generation |
| `agents/retrieval.agent.ts` | RAG retrieval agent |

### Notable directories

| Path | Contents |
|---|---|
| `workflows/` | Workflow definitions (simple, agent, complex, rag) |
| `agents/` | All Mastra agents |
| `tools/` | Mastra tools (schema introspection, SQL execution, EXPLAIN, sampling) |
| `db/` | Database connection and query helpers |
| `parsing/` | SQL and response parsing utilities |
| `validation/` | Output validation logic |
| `visualization/` | Vega-Lite spec helpers |
| `scorers/` | Evaluation scorer definitions |
| `config/` | Mastra runtime configuration |
| `index.ts` | Mastra entry point — registers all workflows and agents |

---

## B — Experiment Runner (`B_experiment-runner/`)

A CLI tool (Bun runtime) for systematically running testset prompts against workflow endpoints, collecting structured artifacts, analysing LLM trace data from Postgres for cost/latency/token metrics, and producing comparison reports with Vega-Lite visualisations. Includes a local web UI for expert grading of outputs.

**Tech stack:** Bun, TypeScript, Commander, Vite, React, Tailwind CSS v4, shadcn/ui, Vega-Lite.

### CLI Commands

```sh
bun index.ts run     --config <path.yaml>           # Run an experiment
bun index.ts analyze --experiment-dir <path>        # Re-analyse traces
bun index.ts compare --target <A> --target <B>      # Compare two experiments
bun index.ts grade   --target <selector>            # Launch expert grading UI
```

### Experiment Configurations

Configs live in `config/` and correspond to the experimental conditions evaluated in the thesis:

| Config | Workflow | Model |
|---|---|---|
| `claude/university.yaml` | simpleWorkflow | Claude (via Vercel AI) |
| `gemini/university.yaml` | simpleWorkflow | Gemini Flash |
| `qwen/university.yaml` | simpleWorkflow | Qwen |
| `ollama/university.yaml` | simpleWorkflow | Local model via Ollama |
| `university-agent.yaml` | agentWorkflow | GPT-based agent |
| `university-complex.yaml` | complexWorkflow | Multi-step planner |
| `university-network.yaml` | networkWorkflow | Network variant |

### Experiment Results

All experiment outputs are stored under `experiments/` with one subdirectory per named condition, each containing timestamped invocation directories:

```
experiments/
├── university/            ← baseline simple workflow
├── university-claude/     ← Claude model condition
├── university-gemini/     ← Gemini model condition
├── university-gemma3/     ← Gemma 3 model condition
├── university-qwen/       ← Qwen model condition
├── university-agent/      ← agent workflow condition
├── university-complex/    ← complex workflow condition
└── university-network/    ← network workflow condition
```

Each invocation directory contains: `manifest.json`, `summary.json`, `trace-cost-report.json`, `grades.json`, `sql-checks.json`, `golden-sql-results.json`, and per-run artifacts (`run.json`, `query.sql`, `vega.raw.json`, `viz.png`).

### Testset

`testsets/university.jsonl` — the natural-language question testset used across all experiments, including `golden_sql` reference answers for execution accuracy (EX) evaluation.

### Notable directories

| Path | Contents |
|---|---|
| `experiments/` | All experimental results and artifacts |
| `results/analysis/` | Cross-experiment comparison reports and plots |
| `testsets/` | JSONL testset files |
| `config/` | YAML experiment configuration files |
| `src/` | Full CLI and grading UI source code |

---

## Reproducibility Notes

- The experiment runner (`B_experiment-runner/`) requires **Bun** and a running instance of the Mastra workflow system to execute experiments. Run `bun install` to restore dependencies.
- The Mastra workflow system (`A_workflow-system/`) requires **Node.js**, **pnpm**, and **Docker**. Database credentials and API keys must be supplied via a `.env` file (see the original project's `.env.example` for required variables).
- `node_modules/` and build artefacts are excluded from this appendix to keep file size manageable.
