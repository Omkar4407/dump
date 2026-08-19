import assert from "node:assert/strict";

import type {
  Memory,
} from "@/types/memory";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchHybrid,
} from "@/lib/memory/search/hybrid-search";

function createMemory(
  id: string,
  overrides: Partial<Memory> = {},
): Memory {
  const now =
    new Date().toISOString();

  return {
    id,
    type: "Text",
    data: "General memory.",
    description: "General memory",
    tags: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const memories: Memory[] = [
    createMemory(
      "pants-size",
      {
        description:
          "Pant size",
        data:
          "waist - 34 inches",
        tags: [
          "clothing",
          "measurements",
        ],
      },
    ),

    createMemory(
      "programming",
      {
        description:
          "Programming notes",
        data:
          "Algorithms, coding, software development and data structures.",
        tags: [
          "programming",
          "coding",
        ],
      },
    ),

    createMemory(
      "travel",
      {
        description:
          "Travel documents",
        data:
          "Passport, flights, hotels and trip planning.",
        tags: [
          "travel",
          "documents",
        ],
      },
    ),

    createMemory(
      "birthday",
      {
        description:
          "Mom birthday",
        data:
          "Her birthday is on June 30.",
        tags: [
          "personal",
          "date",
        ],
      },
    ),

    createMemory(
      "college-project",
      {
        description:
          "College project",
        data:
          "Final year software project and college assignment notes.",
        tags: [
          "college",
          "project",
        ],
      },
    ),
  ];

  const semanticIndex =
    new SemanticIndex();

  await semanticIndex.rebuild(
    memories,
  );

  async function evaluate(
    query: string,
    expectedId: string,
  ): Promise<void> {
    const response =
      await searchHybrid(
        query,
        memories,
        semanticIndex,
        {
          finalLimit: 10,
        },
      );

    console.log(
      `\n========== ${query} ==========`,
    );

    console.log(
      "INTENT:",
      response
        .queryUnderstanding
        .intent,
    );

    console.log(
      "RESULTS:",
      response.results.map(
        (result) => ({
          id:
            result.memory.id,
          description:
            result.memory.description,
          score:
            result.score,
          sources:
            result.sources,
        }),
      ),
    );

    assert.ok(
      response.results.length > 0,
      `"${query}" should return results`,
    );

    const expectedIndex =
      response.results.findIndex(
        (result) =>
          result.memory.id ===
          expectedId,
      );

    assert.notEqual(
      expectedIndex,
      -1,
      `"${query}" should retrieve ${expectedId}`,
    );

    console.log(
      `PASS: ${query} → ${expectedId}`,
    );
  }

  /*
   * Conceptual retrieval.
   */
  await evaluate(
    "fashion",
    "pants-size",
  );

  await evaluate(
    "clothes",
    "pants-size",
  );

  /*
   * Natural-language retrieval.
   */
  await evaluate(
    "what should I wear",
    "pants-size",
  );

  /*
   * Programming domain.
   */
  await evaluate(
    "coding",
    "programming",
  );

  await evaluate(
    "software development",
    "programming",
  );

  /*
   * Travel domain.
   */
  await evaluate(
    "travel documents",
    "travel",
  );

  await evaluate(
    "trip",
    "travel",
  );

  /*
   * Personal information.
   */
  await evaluate(
    "birthday",
    "birthday",
  );

  /*
   * College/work information.
   */
  await evaluate(
    "college assignment",
    "college-project",
  );

  console.log(
    "\nSTEP 5.15C RETRIEVAL QUALITY TESTS PASSED",
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);