import type { Memory } from "@/types/memory";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchHybrid,
} from "@/lib/memory/search/hybrid-search";

const memory: Memory = {
  id: "pants-test",
  type: "Text",
  data: "waist-34 inches",
  description: "pant length",
  tags: [],
  metadata: {},
  createdAt:
    new Date().toISOString(),
  updatedAt:
    new Date().toISOString(),
};

async function main() {
  const index =
    new SemanticIndex();

  await index.indexMemory(
    memory,
  );

  for (
    const query of [
      "measurement",
      "pants",
      "clothes",
      "body measurements",
    ]
  ) {
    console.log(
      `\n========== ${query} ==========`,
    );

    const result =
      await searchHybrid(
        query,
        [memory],
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

    console.log(
      "RESULT COUNT:",
      result.results.length,
    );

    for (
      const item of result.results
    ) {
      console.log(
        "MEMORY:",
        item.memory.id,
      );

      console.log(
        "SCORE:",
        item.score,
      );

      console.log(
        "MATCHES:",
        item.matches,
      );
    }
  }
}

void main();