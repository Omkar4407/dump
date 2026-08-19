import assert from "node:assert/strict";

import type { Memory } from "@/types/memory";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchSemantic,
} from "@/lib/memory/search/semantic-search";

const memories: Memory[] = [
  {
    id: "pants-memory",
    type: "Text",
    description: "Pant length",
    data: "waist - 34 inches",
    tags: [],
    metadata: {},
    createdAt: "2026-08-18T18:30:30.548Z",
    updatedAt: "2026-08-18T18:30:30.548Z",
  },

  {
    id: "birthday-memory",
    type: "Text",
    description: "Birthday",
    data: "Manthan ka bday 30th June ko hai",
    tags: [],
    metadata: {},
    createdAt: "2026-08-18T18:30:30.548Z",
    updatedAt: "2026-08-18T18:30:30.548Z",
  },

  {
    id: "website-memory",
    type: "Link",
    description: "Main website",
    data: "https://malharfest.in",
    tags: [],
    metadata: {},
    createdAt: "2026-08-18T18:30:30.548Z",
    updatedAt: "2026-08-18T18:30:30.548Z",
  },
];

async function main() {
  const index =
    new SemanticIndex();

  await index.rebuild(
    memories,
  );

  const relevantQueries = [
    "measurement",
    "pants",
    "pant",
    "trousers",
    "clothes",
    "clothing",
    "body measurements",
    "waist size",
  ];

  for (
    const query of relevantQueries
  ) {
    const results =
      await searchSemantic(
        query,
        memories,
        index,
        {
          threshold: 0.35,
          limit: 20,
        },
      );

    assert(
      results.some(
        (result) =>
          result.memory.id ===
          "pants-memory",
      ),
      `"${query}" should retrieve the pants memory`,
    );
  }

  /*
   * Strongly unrelated concepts should
   * not retrieve the pants memory.
   */
  const unrelatedQueries = [
    "birthday",
    "website",
  ];

  for (
    const query of unrelatedQueries
  ) {
    const results =
      await searchSemantic(
        query,
        memories,
        index,
        {
          threshold: 0.35,
          limit: 20,
        },
      );

    assert(
      !results.some(
        (result) =>
          result.memory.id ===
          "pants-memory",
      ),
      `"${query}" should not retrieve the pants memory`,
    );
  }

  console.log(
    "STEP 5.13C SEMANTIC RECALL TESTS PASSED",
  );
}

void main();