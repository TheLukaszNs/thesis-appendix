import { createScorer } from "@mastra/core/evals";
import { clampScore, parseFinalData } from "./utils";

export const efficiencyScorer = createScorer({
  id: "efficiency",
  description: "Rewards low attempt count while preserving valid final output.",
})
  .generateScore(({ run }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return 0;
    }

    const denominator = Math.max(finalData.attempts.max - 1, 1);
    const attemptPenalty = (finalData.attempts.used - 1) / denominator;
    const effortScore = 1 - attemptPenalty;
    const validityScore = finalData.quality.passed ? 1 : 0;

    return clampScore(effortScore * 0.6 + validityScore * 0.4);
  })
  .generateReason(({ run, score }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return "final-data output is missing or invalid";
    }

    return `attempts=${finalData.attempts.used}/${finalData.attempts.max}, score=${score.toFixed(3)}`;
  });
