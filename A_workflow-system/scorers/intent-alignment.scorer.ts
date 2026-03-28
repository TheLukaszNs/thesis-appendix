import { createScorer } from "@mastra/core/evals";
import { clampScore, extractKeywords, parseFinalData } from "./utils";

type IntentGroundTruth = {
  expectedFields?: string[];
  intent?: string;
};

export const intentAlignmentScorer = createScorer({
  id: "intent-alignment",
  description: "Heuristic alignment between question intent and produced output.",
})
  .generateScore(({ run }) => {
    const finalData = parseFinalData(run.output);
    if (!finalData) {
      return 0;
    }

    const input = run.input as { question?: string } | undefined;
    const question = input?.question?.trim() ?? "";
    if (!question) {
      return 0;
    }

    const keywords = extractKeywords(question);

    const title =
      typeof finalData.visualization.title === "string"
        ? finalData.visualization.title
        : "";

    const haystack = `${finalData.sql} ${finalData.metadata.columns.join(" ")} ${title}`
      .toLowerCase();

    const keywordCoverage =
      keywords.length === 0
        ? 1
        : keywords.filter((keyword) => haystack.includes(keyword)).length /
          keywords.length;

    const groundTruth = (run.groundTruth ?? {}) as IntentGroundTruth;
    const expectedFields = groundTruth.expectedFields ?? [];
    const expectedFieldCoverage =
      expectedFields.length === 0
        ? 1
        : expectedFields.filter((field) =>
            finalData.metadata.columns.includes(field),
          ).length / expectedFields.length;

    return clampScore(keywordCoverage * 0.7 + expectedFieldCoverage * 0.3);
  })
  .generateReason(({ run, score }) => {
    const groundTruth = (run.groundTruth ?? {}) as IntentGroundTruth;
    return `heuristic intent alignment=${score.toFixed(3)}${groundTruth.intent ? ` (${groundTruth.intent})` : ""}`;
  });
