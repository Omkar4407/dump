import { SemanticIndex } from "@/lib/memory/search/semantic-index";

import { searchHybrid } from "@/lib/memory/search/hybrid-search";

import {
  EVAL_CASES,
  EVAL_MEMORIES,
  type EvalCase,
} from "@/lib/memory/search/retrieval-eval";

/*
 * Retrieval quality report.
 *
 * Not an assertion suite — this prints the
 * measured quality of the whole pipeline so
 * regressions and improvements are visible
 * as numbers rather than opinions.
 *
 * Run: npx tsx src/lib/memory/search/retrieval-eval-report.ts
 */

const TOP_K = 5;

type CaseResult = {
  testCase: EvalCase;
  returned: string[];
  hits: number;
  recall: number;
  precision: number;
  reciprocalRank: number;
};

async function main(): Promise<void> {
  const index = new SemanticIndex();

  await index.rebuild(EVAL_MEMORIES);

  const results: CaseResult[] = [];

  for (const testCase of EVAL_CASES) {
    const response = await searchHybrid(
      testCase.query,
      EVAL_MEMORIES,
      index,
      {
        exactLimit: 50,
        fuzzyLimit: 50,
        fuzzyThreshold: 0.72,
        semanticLimit: 50,
        semanticThreshold: 0.35,
        finalLimit: 50,
        enableExact: true,
        enableFuzzy: true,
        enableSemantic: true,
      },
    );

    const returned = response.results.map(
      (result) => result.memory.id,
    );

    const top = returned.slice(0, TOP_K);

    const hits = testCase.relevant.filter(
      (id) => top.includes(id),
    ).length;

    const firstRelevantIndex = returned.findIndex(
      (id) => testCase.relevant.includes(id),
    );

    results.push({
      testCase,
      returned,
      hits,
      recall: hits / testCase.relevant.length,
      precision:
        top.length === 0
          ? 1
          : hits / top.length,
      reciprocalRank:
        firstRelevantIndex === -1
          ? 0
          : 1 / (firstRelevantIndex + 1),
    });
  }

  const meanRecall =
    results.reduce(
      (total, item) => total + item.recall,
      0,
    ) / results.length;

  const meanPrecision =
    results.reduce(
      (total, item) => total + item.precision,
      0,
    ) / results.length;

  const meanReciprocalRank =
    results.reduce(
      (total, item) => total + item.reciprocalRank,
      0,
    ) / results.length;

  const totalMisses = results.filter(
    (item) => item.recall === 0,
  );

  console.log(
    `\nRETRIEVAL QUALITY — ${EVAL_MEMORIES.length} memories, ${EVAL_CASES.length} queries\n`,
  );

  console.log(
    `Recall@${TOP_K}      ${(meanRecall * 100).toFixed(1)}%`,
  );

  console.log(
    `Precision@${TOP_K}   ${(meanPrecision * 100).toFixed(1)}%`,
  );

  console.log(
    `MRR             ${meanReciprocalRank.toFixed(3)}`,
  );

  console.log(
    `Total misses    ${totalMisses.length} / ${results.length}\n`,
  );

  console.log("PER-QUERY\n");

  for (const item of results) {
    const status =
      item.recall === 1
        ? "OK  "
        : item.recall === 0
          ? "MISS"
          : "PART";

    console.log(
      `${status} r=${(item.recall * 100).toFixed(0).padStart(3)}% p=${(item.precision * 100).toFixed(0).padStart(3)}% rr=${item.reciprocalRank.toFixed(2)}  "${item.testCase.query}"`,
    );

    if (item.recall < 1) {
      const missing = item.testCase.relevant.filter(
        (id) => !item.returned.slice(0, TOP_K).includes(id),
      );

      console.log(
        `        missing: ${missing.join(", ")}`,
      );

      console.log(
        `        got:     ${item.returned.slice(0, TOP_K).join(", ") || "(nothing)"}`,
      );
    }
  }

  console.log("");
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});
