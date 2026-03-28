# Multi-Experiment Comparison Report

Generated at: 2026-02-25T22:34:54.170Z
Compared approaches: 3
Cases: 100
Runs per case (k): 1

## Selected Targets

- university-agent/2026-02-23T10-46-45.696Z (/Users/lukasz/code/studia/agent-runner-2/experiments/university-agent/2026-02-23T10-46-45.696Z)
- university-complex/2026-02-23T11-04-07.142Z (/Users/lukasz/code/studia/agent-runner-2/experiments/university-complex/2026-02-23T11-04-07.142Z)
- university/2026-02-22T23-34-17.607Z (/Users/lukasz/code/studia/agent-runner-2/experiments/university/2026-02-22T23-34-17.607Z)

## Approach Summary

| Approach | pass@1 | pass@k | run success | fail runs | p95 latency (ms) | total cost (USD) | cost/success (USD) |
|---|---:|---:|---:|---:|---:|---:|---:|
| university | 88.0% | 88.0% | 88.0% | 12 | 75631 | 0.8364 | $0.0095 |
| university-agent | 21.0% | 21.0% | 21.0% | 79 | 27887 | 0.2628 | $0.0125 |
| university-complex | 87.0% | 87.0% | 87.0% | 13 | 120004 | 1.3748 | $0.0158 |

## Key Findings

- Best pass@k: **university** (88.0%).
- Slowest p95 latency: **university-complex** (120004 ms).
- Most frequent failure kind: **invalid_shape** (90 runs).

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

### university-agent

Failure stages:
- sql: 79 (100.0%)

Top failure kinds:
- invalid_shape: 79 (100.0%)

Top failure messages:
- 79x: Missing or invalid 'data' in endpoint response (expected result.finalData.data, result.data, or data).

### university-complex

Failure stages:
- e2e: 13 (100.0%)

Top failure kinds:
- timeout: 13 (100.0%)

Top failure messages:
- 13x: The operation was aborted.

## Stability, Latency, and Cost

### university

- Stability: always_pass=88, flaky=0, always_fail=12
- Latency (all runs): min=19880 ms, p50=45892 ms, p95=75631 ms, max=120009 ms
- Cost: total=$0.8364, per_run=$0.0084, per_success=$0.0095, tokens_per_success=15539.32
- Trace coverage: 99.0% (traceId present).

### university-agent

- Stability: always_pass=21, flaky=0, always_fail=79
- Latency (all runs): min=9728 ms, p50=16974 ms, p95=27887 ms, max=40924 ms
- Cost: total=$0.2628, per_run=$0.0026, per_success=$0.0125, tokens_per_success=7365.29
- Trace coverage: 100.0% (traceId present).

### university-complex

- Stability: always_pass=87, flaky=0, always_fail=13
- Latency (all runs): min=59174 ms, p50=91714 ms, p95=120004 ms, max=120010 ms
- Cost: total=$1.3748, per_run=$0.0137, per_success=$0.0158, tokens_per_success=27191.95
- Trace coverage: 87.0% (traceId present).

## Token and Model Usage

| Approach | API Calls | Input Tokens | Output Tokens | Reasoning Tokens | Cached Input | Models |
|---|---:|---:|---:|---:|---:|---|
| university | 187 | 1.1M | 282.6k | 192.3k | 0 | openai/gpt-5-mini |
| university-agent | 100 | 26.6k | 128.1k | 90.0k | 0 | openai/gpt-5-mini |
| university-complex | 353 | 1.9M | 447.7k | 294.5k | 66.3k | openai/gpt-5-mini |

## Human Evaluation

| Approach | Graded | Coverage | Mean | Median | Acceptable+ (>=3) | Good+ (>=4) | Issues/Run |
|---|---:|---:|---:|---:|---:|---:|---:|
| university | 100/100 | 100.0% | 3.97 | 5.0 | 79.0% | 71.0% | 1.16 |
| university-agent | 100/100 | 100.0% | 1.68 | 1.0 | 19.0% | 17.0% | 0.97 |
| university-complex | 100/100 | 100.0% | 4.02 | 5.0 | 85.0% | 74.0% | 0.98 |

## Execution Accuracy

| Approach | Evaluated | EX Rate | EX pass@1 | EX pass@k | Row Count Accuracy |
|---|---:|---:|---:|---:|---:|
| university | 82 | 18.3% | 18.3% | 18.3% | 61.0% |
| university-agent | 21 | 42.9% | 42.9% | 42.9% | 71.4% |
| university-complex | 82 | 25.6% | 25.6% | 25.6% | 64.6% |

Absolute EX rate (matches / total cases, independent of evaluation coverage):

- **university**: 15/100 cases match (15.0% absolute EX rate)
- **university-agent**: 9/100 cases match (9.0% absolute EX rate)
- **university-complex**: 21/100 cases match (21.0% absolute EX rate)

## SQL Structural Validity

| Approach | Checked | Validity Rate | invalid_table | invalid_column | syntax_error | zero_rows |
|---|---:|---:|---:|---:|---:|---:|
| university | 88 | 100.0% | 0 | 0 | 0 | 0 |
| university-agent | 21 | 100.0% | 0 | 0 | 0 | 0 |
| university-complex | 87 | 98.9% | 0 | 0 | 0 | 1 |

## Combined Quality Metrics

| Approach | Quality-Adjusted Success Rate |
|---|---:|
| university | 79.0% |
| university-agent | 18.0% |
| university-complex | 85.0% |

## Grading Findings

- Best mean quality score: **university-complex** (4.02).
- Best EX rate: **university-agent** (42.9%).
- Most common issue tag: **result_mismatch** (140 occurrences).

