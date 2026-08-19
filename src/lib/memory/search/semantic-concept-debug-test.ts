import type { Memory } from "@/types/memory";

import {
  cosineSimilarity,
  generateEmbedding,
} from "@/lib/memory/search/embedding";

import {
  buildSemanticText,
} from "@/lib/memory/search/semantic-text";

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

const concepts = [
  "clothes",
  "clothing",
  "apparel",
  "garments",

  "pants",
  "trousers",
  "bottoms",

  "clothing measurements",
  "clothing size",
  "body measurements",
  "body size",

  "waist measurement",
  "waist size",
  "length measurement",

  "fashion",
  "wear",
  "outfit",
];

async function main() {
  const memoryEmbedding =
    await generateEmbedding(
      buildSemanticText(memory),
    );

  const results: {
    concept: string;
    score: number;
  }[] = [];

  for (const concept of concepts) {
    const embedding =
      await generateEmbedding(
        concept,
      );

    results.push({
      concept,
      score:
        cosineSimilarity(
          embedding,
          memoryEmbedding,
        ),
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score,
  );

  console.log(
    "\nSEMANTIC CONCEPT SCORES\n",
  );

  for (const result of results) {
    console.log(
      `${result.concept.padEnd(28)} ${result.score.toFixed(4)}`,
    );
  }
}

void main();