import { createScorer } from "@mastra/core/evals";
import { runVegaSpecSanityCheck } from "@/mastra/visualization/spec-sanity";
import { parseFinalData } from "./utils";

export const vegaContractScorer = createScorer({
  id: "vega-contract",
  description: "Ensures Vega-Lite spec follows required contract and field mapping.",
})
  .generateScore(({ run }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return 0;
    }

    return runVegaSpecSanityCheck({
      visualization: finalData.visualization,
      metadata: finalData.metadata,
    }).passed
      ? 1
      : 0;
  })
  .generateReason(({ run, score }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return "final-data output is missing or invalid";
    }

    const sanity = runVegaSpecSanityCheck({
      visualization: finalData.visualization,
      metadata: finalData.metadata,
    });

    if (score === 1) {
      return "Vega contract passed";
    }

    return sanity.issues.join(" | ");
  });
