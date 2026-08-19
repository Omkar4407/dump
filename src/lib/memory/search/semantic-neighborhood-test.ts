import assert from "node:assert/strict";

import type {
  Memory,
} from "@/types/memory";

import {
  SemanticIndex,
} from "./semantic-index";

import {
  discoverSemanticNeighbors,
} from "./semantic-search";

const memories: Memory[] = [
  {
    id: "fashion-memory",
    type: "Text",
    description: "Pant size",
    data: "waist - 34 inches",
    tags: [],
    metadata: {},
    createdAt:
      "2026-08-18T00:00:00.000Z",
    updatedAt:
      "2026-08-18T00:00:00.000Z",
  },

  {
    id: "birthday-memory",
    type: "Text",
    description: "Mom birthday",
    data: "June 30",
    tags: [],
    metadata: {},
    createdAt:
      "2026-08-18T00:00:00.000Z",
    updatedAt:
      "2026-08-18T00:00:00.000Z",
  },

  {
    id: "coding-memory",
    type: "Code",
    description: "Binary search",
    data: "binary search implementation",
    tags: [],
    metadata: {},
    createdAt:
      "2026-08-18T00:00:00.000Z",
    updatedAt:
      "2026-08-18T00:00:00.000Z",
  },

  {
    id: "travel-memory",
    type: "Text",
    description: "Passport",
    data: "Passport expires in 2031",
    tags: [],
    metadata: {},
    createdAt:
      "2026-08-18T00:00:00.000Z",
    updatedAt:
      "2026-08-18T00:00:00.000Z",
  },
];

async function main() {
  const index =
    new SemanticIndex();

  await index.rebuild(
    memories,
  );

  /*
   * The function must return a ranked
   * semantic neighborhood rather than
   * requiring the caller to know a
   * domain-specific synonym.
   */
  const fashionResults =
    await discoverSemanticNeighbors(
      "fashion",
      memories,
      index,
      {
        limit: 4,
      },
    );

  assert(
    fashionResults.length > 0,
    "fashion should produce semantic neighbors",
  );

  assert.equal(
    fashionResults[0]?.memory.id,
    "fashion-memory",
    "fashion should rank the clothing memory first",
  );

  /*
   * Completely different semantic
   * domains should still work through
   * the same mechanism.
   */
  const codingResults =
    await discoverSemanticNeighbors(
      "sorting algorithm code",
      memories,
      index,
      {
        limit: 4,
      },
    );

  assert(
    codingResults.length > 0,
    "coding query should produce semantic neighbors",
  );

  assert.equal(
    codingResults[0]?.memory.id,
    "coding-memory",
    "coding query should rank coding memory first",
  );

  const travelResults =
    await discoverSemanticNeighbors(
      "travel documents",
      memories,
      index,
      {
        limit: 4,
      },
    );

  assert(
    travelResults.length > 0,
    "travel query should produce semantic neighbors",
  );

  assert.equal(
    travelResults[0]?.memory.id,
    "travel-memory",
    "travel query should rank travel memory first",
  );

  console.log(
    "STEP 5.14C SEMANTIC NEIGHBORHOOD TESTS PASSED",
  );
}

void main();