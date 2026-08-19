import type { Memory } from "@/types/memory";

import {
  cosineSimilarity,
  generateEmbedding,
} from "@/lib/memory/search/embedding";

import {
  buildSemanticText,
} from "@/lib/memory/search/semantic-text";

import {
  expandSemanticQuery,
} from "@/lib/memory/search/semantic-query-expansion";

const memory: Memory = {
  id: "pants-memory",
  type: "Text",
  description: "Pant length",
  data: "waist - 34 inches",
  tags: [],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const text =
    buildSemanticText(memory);

  const memoryEmbedding =
    await generateEmbedding(text);

  for (const query of [
    "clothes",
    "measurement",
    "trousers",
  ]) {
    const expanded =
      expandSemanticQuery(query);

    console.log(
      `\n========== ${query} ==========`,
    );

    console.log(
      "EXPANDED:",
      expanded,
    );

    for (const expandedQuery of expanded) {
      const embedding =
        await generateEmbedding(
          expandedQuery,
        );

      const score =
        cosineSimilarity(
          embedding,
          memoryEmbedding,
        );

      console.log(
        `${expandedQuery.padEnd(24)} ${score.toFixed(4)}`,
      );
    }
  }
}

void main();