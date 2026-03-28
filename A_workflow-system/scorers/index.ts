import type { MastraScorers } from "@mastra/core/evals";

export { sqlSafetyScorer } from "./sql-safety.scorer";
export { sqlExecutionSuccessScorer } from "./sql-execution.scorer";
export { vegaContractScorer } from "./vega-contract.scorer";
export { intentAlignmentScorer } from "./intent-alignment.scorer";
export { efficiencyScorer } from "./efficiency.scorer";

import { sqlSafetyScorer } from "./sql-safety.scorer";
import { sqlExecutionSuccessScorer } from "./sql-execution.scorer";
import { vegaContractScorer } from "./vega-contract.scorer";
import { intentAlignmentScorer } from "./intent-alignment.scorer";
import { efficiencyScorer } from "./efficiency.scorer";

export const finalDataStepScorers: MastraScorers = {
  sqlSafetyScorer: { scorer: sqlSafetyScorer },
  sqlExecutionSuccessScorer: { scorer: sqlExecutionSuccessScorer },
  vegaContractScorer: { scorer: vegaContractScorer },
  intentAlignmentScorer: { scorer: intentAlignmentScorer },
  efficiencyScorer: { scorer: efficiencyScorer },
};
