import type { Memory } from "@/types/memory";

import {
  cosineSimilarity,
  generateEmbedding,
} from "@/lib/memory/search/embedding";

import {
  buildSemanticText,
} from "@/lib/memory/search/semantic-text";

const memory: Memory = {
  id: "pants-test",
  type: "Text",
  data: "waist-34 inches",
  description: "pant length",
  tags: [],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const queries = [
  "measurement",
  "pants",
  "clothes",
  "body measurements",
  "pant",
  "trousers",
  "waist size",
  "clothing measurements",
];

async function main() {
  const semanticText =
    buildSemanticText(memory);

  console.log("\nSEMANTIC TEXT:");
  console.log(semanticText);

  console.log(
    "\nGenerating memory embedding...",
  );

  const memoryEmbedding =
    await generateEmbedding(
      semanticText,
    );

  console.log(
    "\nSIMILARITY SCORES:\n",
  );

  for (const query of queries) {
    const queryEmbedding =
      await generateEmbedding(query);

    const score =
      cosineSimilarity(
        queryEmbedding,
        memoryEmbedding,
      );

    console.log(
      `${query.padEnd(24)} ${score.toFixed(4)}`,
    );
  }
}

void main();