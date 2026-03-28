import { createScorer } from "@mastra/core/evals";
import { parseFinalData } from "./utils";

export const sqlExecutionSuccessScorer = createScorer({
  id: "sql-execution-success",
  description: "Checks whether SQL execution completed successfully.",
})
  .generateScore(({ run }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return 0;
    }

    const hasExecutionFailure = finalData.quality.issues.some((issue) =>
      issue.toLowerCase().includes("sql execution failed"),
    );

    return hasExecutionFailure ? 0 : 1;
  })
  .generateReason(({ run, score }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return "final-data output is missing or invalid";
    }

    if (score === 1) {
      return `SQL executed successfully with ${finalData.metadata.rowCount} rows`;
    }

    return finalData.quality.issues.find((issue) =>
      issue.toLowerCase().includes("sql execution failed"),
    ) ?? "SQL execution failed";
  });
