# Multi-Experiment Comparison Report

Generated at: 2026-02-25T22:35:12.149Z
Compared approaches: 2
Cases: 100
Runs per case (k): 1

## Selected Targets

- university-claude/2026-02-23T14-01-34.254Z (/Users/lukasz/code/studia/agent-runner-2/experiments/university-claude/2026-02-23T14-01-34.254Z)
- university/2026-02-22T23-34-17.607Z (/Users/lukasz/code/studia/agent-runner-2/experiments/university/2026-02-22T23-34-17.607Z)

## Approach Summary

| Approach | pass@1 | pass@k | run success | fail runs | p95 latency (ms) | total cost (USD) | cost/success (USD) |
|---|---:|---:|---:|---:|---:|---:|---:|
| university | 88.0% | 88.0% | 88.0% | 12 | 75631 | 0.8364 | $0.0095 |
| university-claude | 90.0% | 90.0% | 90.0% | 10 | 56415 | 2.3429 | $0.0260 |

## Key Findings

- Best pass@k: **university-claude** (90.0%).
- Slowest p95 latency: **university** (75631 ms).
- Most frequent failure kind: **invalid_shape** (18 runs).

## Failure Diagnostics

### university

Failure stages:
- sql: 11 (91.7%)
- e2e: 1 (8.3%)

Top failure kinds:
- invalid_shape: 11 (91.7%)
- timeout: 1 (8.3%)

Top failure messages:
- 11x: Missing or invalid 'data' in endpoint response (expected result.finalData.data, result.data, or data).
- 1x: The operation was aborted.

### university-claude

Failure stages:
- sql: 7 (70.0%)
- viz: 3 (30.0%)

Top failure kinds:
- invalid_shape: 7 (70.0%)
- viz_failure: 3 (30.0%)

Top failure messages:
- 7x: Missing or invalid 'data' in endpoint response (expected result.finalData.data, result.data, or data).
- 3x: Failed with exit code 1

## Stability, Latency, and Cost

### university

- Stability: always_pass=88, flaky=0, always_fail=12
- Latency (all runs): min=19880 ms, p50=45892 ms, p95=75631 ms, max=120009 ms
- Cost: total=$0.8364, per_run=$0.0084, per_success=$0.0095, tokens_per_success=15539.32
- Trace coverage: 99.0% (traceId present).

### university-claude

- Stability: always_pass=90, flaky=0, always_fail=10
- Latency (all runs): min=14370 ms, p50=30311 ms, p95=56415 ms, max=77802 ms
- Cost: total=$2.3429, per_run=$0.0234, per_success=$0.0260, tokens_per_success=21635.61
- Trace coverage: 100.0% (traceId present).

## Token and Model Usage

| Approach | API Calls | Input Tokens | Output Tokens | Reasoning Tokens | Cached Input | Models |
|---|---:|---:|---:|---:|---:|---|
| university | 187 | 1.1M | 282.6k | 192.3k | 0 | openai/gpt-5-mini |
| university-claude | 193 | 1.8M | 98.9k | 0 | 0 | anthropic/claude-haiku-4.5 |

## Human Evaluation

| Approach | Graded | Coverage | Mean | Median | Acceptable+ (>=3) | Good+ (>=4) | Issues/Run |
|---|---:|---:|---:|---:|---:|---:|---:|
| university | 100/100 | 100.0% | 3.97 | 5.0 | 79.0% | 71.0% | 1.16 |
| university-claude | 100/100 | 100.0% | 3.96 | 5.0 | 81.0% | 68.0% | 0.93 |

## Execution Accuracy

| Approach | Evaluated | EX Rate | EX pass@1 | EX pass@k | Row Count Accuracy |
|---|---:|---:|---:|---:|---:|
| university | 82 | 18.3% | 18.3% | 18.3% | 61.0% |
| university-claude | 83 | 30.1% | 30.1% | 30.1% | 67.5% |

Absolute EX rate (matches / total cases, independent of evaluation coverage):

- **university**: 15/100 cases match (15.0% absolute EX rate)
- **university-claude**: 25/100 cases match (25.0% absolute EX rate)

## SQL Structural Validity

| Approach | Checked | Validity Rate | invalid_table | invalid_column | syntax_error | zero_rows |
|---|---:|---:|---:|---:|---:|---:|
| university | 88 | 100.0% | 0 | 0 | 0 | 0 |
| university-claude | 93 | 100.0% | 0 | 0 | 0 | 0 |

## Combined Quality Metrics

| Approach | Quality-Adjusted Success Rate |
|---|---:|
| university | 79.0% |
| university-claude | 81.0% |

## Grading Findings

- Best mean quality score: **university** (3.97).
- Best EX rate: **university-claude** (30.1%).
- Most common issue tag: **result_mismatch** (125 occurrences).

