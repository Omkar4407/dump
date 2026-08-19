import assert from "node:assert/strict";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchSemantic,
} from "@/lib/memory/search/semantic-search";

import type {
  Memory,
} from "@/types/memory";

function createMemory(
  id: string,
  overrides: Partial<Memory> = {},
): Memory {
  const now =
    new Date().toISOString();

  return {
    id,
    type: "Text",
    data:
      "General notes.",
    description:
      "General note",
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
      "programming",
      {
        description:
          "Learning programming and software development",
        data:
          "Studying JavaScript, TypeScript, algorithms, and application development.",
        tags: [
          "programming",
          "software",
        ],
      },
    ),

    createMemory(
      "cooking",
      {
        description:
          "Cooking and meal preparation",
        data:
          "Recipes using tomatoes, onions, pasta, herbs, and olive oil.",
        tags: [
          "food",
          "cooking",
        ],
      },
    ),

    createMemory(
      "travel",
      {
        description:
          "Travel planning",
        data:
          "Planning a trip with hotels, flights, sightseeing, and local transportation.",
        tags: [
          "travel",
          "trip",
        ],
      },
    ),
  ];

  const index =
    new SemanticIndex();

  /*
   * 1. Build the semantic index.
   */
  await index.rebuild(
    memories,
  );

  assert.equal(
    index.size,
    3,
    "all test memories should be indexed",
  );

  /*
   * 2. Programming-related query
   * should retrieve programming
   * memory strongly.
   */
  {
    const results =
      await searchSemantic(
        "learning software engineering and coding",
        memories,
        index,
        {
          threshold:
            0.35,
          limit:
            10,
        },
      );

    assert.ok(
      results.length >
        0,
      "semantic search should return programming-related results",
    );

    assert.equal(
      results[0]?.memory.id,
      "programming",
      "programming query should rank programming memory first",
    );

    assert.ok(
      results[0]?.score >
        0.35,
      "top semantic result must satisfy the threshold",
    );
  }

  /*
   * 3. Cooking query should retrieve
   * cooking memory.
   */
  {
    const results =
      await searchSemantic(
        "recipes and preparing food",
        memories,
        index,
        {
          threshold:
            0.35,
          limit:
            10,
        },
      );

    assert.ok(
      results.length >
        0,
      "cooking query should return results",
    );

    assert.equal(
      results[0]?.memory.id,
      "cooking",
      "cooking query should rank cooking memory first",
    );
  }

  /*
   * 4. Travel query should retrieve
   * travel memory.
   */
  {
    const results =
      await searchSemantic(
        "planning a vacation trip",
        memories,
        index,
        {
          threshold:
            0.35,
          limit:
            10,
        },
      );

    assert.ok(
      results.length >
        0,
      "travel query should return results",
    );

    assert.equal(
      results[0]?.memory.id,
      "travel",
      "travel query should rank travel memory first",
    );
  }

  /*
   * 5. Empty query should return
   * no results without invoking
   * the embedding model.
   */
  {
    const results =
      await searchSemantic(
        "   ",
        memories,
        index,
      );

    assert.deepEqual(
      results,
      [],
      "empty query must return no semantic results",
    );
  }

  /*
   * 6. Very high threshold should
   * filter weaker candidates.
   */
  {
    const results =
      await searchSemantic(
        "learning programming",
        memories,
        index,
        {
          threshold:
            0.99,
          limit:
            10,
        },
      );

    /*
     * The exact number is model
     * dependent. The important
     * property is that every result
     * actually satisfies the
     * requested threshold.
     */
    for (
      const result of results
    ) {
      assert.ok(
        result.score >=
          0.99,
        "every result must satisfy the configured threshold",
      );
    }
  }

  /*
   * 7. Result limit must be honored.
   */
  {
    const results =
      await searchSemantic(
        "notes",
        memories,
        index,
        {
          threshold:
            -1,
          limit:
            2,
        },
      );

    assert.ok(
      results.length <=
        2,
      "semantic result limit must be respected",
    );
  }

  /*
   * 8. Results must be sorted by
   * descending similarity.
   */
  {
    const results =
      await searchSemantic(
        "software programming",
        memories,
        index,
        {
          threshold:
            -1,
          limit:
            10,
        },
      );

    for (
      let index = 1;
      index <
      results.length;
      index++
    ) {
      const previous =
        results[
          index - 1
        ];

      const current =
        results[
          index
        ];

      assert.ok(
        previous &&
          current &&
          previous.score >=
            current.score,
        "semantic results must be sorted by descending similarity",
      );
    }
  }

  /*
   * 9. Memories without index
   * entries must simply be skipped.
   */
  {
    const partialIndex =
      new SemanticIndex();

    await partialIndex.indexMemory(
      memories[0]!,
    );

    const results =
      await searchSemantic(
        "cooking",
        memories,
        partialIndex,
        {
          threshold:
            -1,
          limit:
            10,
        },
      );

    for (
      const result of results
    ) {
      assert.equal(
        result.memory.id,
        "programming",
        "only indexed memories should participate in semantic search",
      );
    }
  }

  /*
   * 10. Every result must expose
   * its semantic score and index
   * entry.
   */
  {
    const results =
      await searchSemantic(
        "programming",
        memories,
        index,
        {
          threshold:
            -1,
          limit:
            10,
        },
      );

    assert.ok(
      results.length >
        0,
      "expected semantic results",
    );

    for (
      const result of results
    ) {
      assert.ok(
        Number.isFinite(
          result.score,
        ),
        "semantic score must be finite",
      );

      assert.ok(
        result.entry,
        "semantic result must expose its index entry",
      );

      assert.equal(
        result.entry.memoryId,
        result.memory.id,
        "result entry must correspond to the returned memory",
      );
    }
  }

  console.log(
    "STEP 5.12H SEMANTIC SEARCH TESTS PASSED",
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