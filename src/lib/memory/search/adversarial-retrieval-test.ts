import assert from "node:assert/strict";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchHybrid,
} from "@/lib/memory/search/hybrid-search";

import type {
  Memory,
} from "@/types/memory";

function createMemory(
  id: string,
  description: string,
  data: string,
  tags: string[] = [],
): Memory {
  const now =
    new Date().toISOString();

  return {
    id,
    type: "Text",
    description,
    data,
    tags,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

const memories: Memory[] = [
  createMemory(
    "pants-size",
    "Pant size",
    "My pants size is waist 34 inches.",
    ["clothing", "measurements"],
  ),

  createMemory(
    "fashion-ideas",
    "Fashion ideas",
    "Outfit combinations, colors, styles and clothing inspiration.",
    ["fashion", "style"],
  ),

  createMemory(
    "clothes-shopping",
    "Clothes shopping",
    "Clothes I want to buy: shirts, jeans, jackets and pants.",
    ["shopping", "clothing"],
  ),

  createMemory(
    "gym-clothes",
    "Gym clothes",
    "Workout shirts, shorts, sports shoes and training clothes.",
    ["gym", "clothing"],
  ),

  createMemory(
    "travel-packing",
    "Travel packing",
    "Things to pack for trips including clothes, shoes and toiletries.",
    ["travel", "packing"],
  ),

  createMemory(
    "body-measurements",
    "Body measurements",
    "Waist, chest, shoulder, height and other body measurements.",
    ["measurements"],
  ),

  createMemory(
    "shoe-size",
    "Shoe size",
    "My shoe size and preferred footwear measurements.",
    ["clothing", "measurements"],
  ),

  createMemory(
    "shirts",
    "Shirt size",
    "My preferred shirt size and shirt measurements.",
    ["clothing", "measurements"],
  ),

  createMemory(
    "college",
    "College project",
    "College assignment and project work.",
    ["college"],
  ),

  createMemory(
    "programming",
    "Programming notes",
    "Software development, coding and algorithms.",
    ["coding"],
  ),

  createMemory(
    "recipes",
    "Cooking recipes",
    "Recipes, ingredients, food and cooking.",
    ["food"],
  ),

  createMemory(
    "travel",
    "Travel documents",
    "Passport, flights, hotels and travel planning.",
    ["travel"],
  ),
];

async function runQuery(
  query: string,
  expectedId: string,
  maxRank: number,
): Promise<void> {
  const index =
    new SemanticIndex();

  await index.rebuild(
    memories,
  );

  const response =
    await searchHybrid(
      query,
      memories,
      index,
      {
        finalLimit: 10,
      },
    );

  console.log(
    `\n========== ${query} ==========`,
  );

  console.log(
    response.results.map(
      (result) => ({
        id:
          result.memory.id,

        description:
          result.memory.description,

        score:
          Number(
            result.score.toFixed(
              4,
            ),
          ),

        sources:
          result.sources,
      }),
    ),
  );

  const position =
    response.results.findIndex(
      (result) =>
        result.memory.id ===
        expectedId,
    );

  assert.ok(
    position >= 0,
    `"${query}" should retrieve "${expectedId}"`,
  );

  assert.ok(
    position < maxRank,
    `"${query}" should rank "${expectedId}" within top ${maxRank}; got position ${position + 1}`,
  );

  console.log(
    `PASS: ${query} → ${expectedId} (#${position + 1})`,
  );
}

async function main(): Promise<void> {
  /*
   * A broad fashion query should still
   * be able to discover clothing-related
   * memories.
   */
  await runQuery(
    "fashion",
    "fashion-ideas",
    4,
  );

  /*
   * "pants" should strongly prefer the
   * actual pants-size memory.
   */
  await runQuery(
    "pants",
    "pants-size",
    3,
  );

  /*
   * A measurement query should prefer
   * the general body measurement memory
   * rather than fashion content.
   */
  await runQuery(
    "body measurements",
    "body-measurements",
    3,
  );

  /*
   * Asking about clothing measurements
   * should favor measurement memories.
   */
  await runQuery(
    "clothing measurements",
    "pants-size",
    4,
  );

  /*
   * A sizing question should discover
   * the relevant size information.
   */
  await runQuery(
    "what size am I",
    "pants-size",
    4,
  );

  /*
   * Shopping intent should favor the
   * shopping memory over raw measurements.
   */
  await runQuery(
    "shopping for clothes",
    "clothes-shopping",
    3,
  );

  /*
   * "what should I wear" is intentionally
   * ambiguous. Fashion ideas should be
   * competitive, but the system should
   * still retrieve the clothing cluster.
   */
  await runQuery(
    "what should I wear",
    "fashion-ideas",
    4,
  );

  /*
   * Completely unrelated concepts should
   * remain unaffected.
   */
  await runQuery(
    "programming",
    "programming",
    2,
  );

  await runQuery(
    "recipes",
    "recipes",
    2,
  );

  await runQuery(
    "travel documents",
    "travel",
    2,
  );

  console.log(
    "\nSTEP 5.16B ADVERSARIAL RETRIEVAL TESTS PASSED",
  );
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode = 1;
  },
);