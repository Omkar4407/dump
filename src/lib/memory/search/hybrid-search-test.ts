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
  overrides: Partial<Memory> = {},
): Memory {
  const now =
    new Date().toISOString();

  return {
    id,
    type: "Text",
    data:
      "General memory content.",
    description:
      "General memory",
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
      "github-exact",
      {
        description:
          "GitHub repository for my software project",
        data:
          "Source code and development notes.",
        tags: [
          "github",
          "software",
        ],
      },
    ),

    createMemory(
      "programming-semantic",
      {
        description:
          "Learning software engineering",
        data:
          "Studying programming, coding, algorithms, and application development.",
        tags: [
          "programming",
          "coding",
        ],
      },
    ),

    createMemory(
      "cooking",
      {
        description:
          "Cooking recipes",
        data:
          "Tomatoes, onions, pasta, herbs, and olive oil.",
        tags: [
          "cooking",
          "food",
        ],
      },
    ),

    createMemory(
      "travel",
      {
        description:
          "Vacation planning",
        data:
          "Hotels, flights, sightseeing, and transportation.",
        tags: [
          "travel",
        ],
      },
    ),

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
  ];

  

  const semanticIndex =
    new SemanticIndex();

  await semanticIndex.rebuild(
    memories,
  );

  /*
   * 1. Exact query should put
   * exact lexical result first.
   */
  {
    const response =
      await searchHybrid(
        "GitHub",
        memories,
        semanticIndex,
        {
          finalLimit:
            10,
        },
      );

    assert.ok(
      response.results.length >
        0,
      "GitHub query should return results",
    );

    assert.equal(
      response.results[0]?.memory.id,
      "github-exact",
      "exact GitHub result should rank first in hybrid search",
    );

    assert.ok(
      response.exactResults.length >
        0,
      "exact engine should contribute results",
    );

    assert.ok(
      response.semanticResults.length >
        0,
      "semantic engine should contribute results",
    );
  }

  /*
   * 2. Semantic query should be able
   * to retrieve a concept without
   * requiring exact wording.
   */
  {
    const response =
      await searchHybrid(
        "studying how to write software",
        memories,
        semanticIndex,
        {
          finalLimit:
            10,
        },
      );

    assert.ok(
      response.results.length >
        0,
      "semantic concept query should return results",
    );

    assert.equal(
      response.results[0]?.memory.id,
      "programming-semantic",
      "semantic programming result should rank first",
    );
  }

  /*
   * 3. Fuzzy query should remain
   * functional inside the hybrid
   * pipeline.
   */
  {
    const response =
      await searchHybrid(
        "Githb",
        memories,
        semanticIndex,
        {
          finalLimit:
            10,
        },
      );

    assert.ok(
      response.results.length >
        0,
      "fuzzy GitHub typo should return results",
    );

    assert.equal(
      response.results[0]?.memory.id,
      "github-exact",
      "fuzzy GitHub query should recover the GitHub memory",
    );
  }

  /*
   * 4. Search engines can be
   * independently disabled.
   */
  {
    const response =
      await searchHybrid(
        "GitHub",
        memories,
        semanticIndex,
        {
          enableExact:
            false,

          enableFuzzy:
            false,

          enableSemantic:
            true,

          finalLimit:
            10,
        },
      );

    assert.equal(
      response.exactResults.length,
      0,
      "exact engine should be disabled",
    );

    assert.equal(
      response.fuzzyResults.length,
      0,
      "fuzzy engine should be disabled",
    );

    assert.ok(
      response.semanticResults.length >
        0,
      "semantic engine should remain enabled",
    );

    for (
      const result of
      response.results
    ) {
      assert.deepEqual(
        result.sources,
        ["semantic"],
        "only semantic source should be present",
      );
    }
  }

  /*
   * 5. Semantic engine can be
   * disabled while lexical search
   * continues working.
   */
  {
    const response =
      await searchHybrid(
        "GitHub",
        memories,
        semanticIndex,
        {
          enableSemantic:
            false,

          finalLimit:
            10,
        },
      );

    assert.equal(
      response.semanticResults.length,
      0,
      "semantic engine should be disabled",
    );

    assert.ok(
      response.exactResults.length >
        0,
      "exact search must continue working",
    );

    assert.equal(
      response.results[0]?.memory.id,
      "github-exact",
      "lexical-only hybrid result should still rank correctly",
    );
  }

  /*
   * 6. Final limit must be respected.
   */
  {
    const response =
      await searchHybrid(
        "memory",
        memories,
        semanticIndex,
        {
          finalLimit:
            2,
        },
      );

    assert.ok(
      response.results.length <=
        2,
      "final result limit must be respected",
    );
  }

  /*
   * 7. Empty query should avoid
   * unnecessary search work.
   */
  {
    const response =
      await searchHybrid(
        "   ",
        memories,
        semanticIndex,
      );

    assert.deepEqual(
      response.results,
      [],
      "empty hybrid query must return no results",
    );

    assert.deepEqual(
      response.exactResults,
      [],
      "empty hybrid query must not return exact results",
    );

    assert.deepEqual(
      response.fuzzyResults,
      [],
      "empty hybrid query must not return fuzzy results",
    );

    assert.deepEqual(
      response.semanticResults,
      [],
      "empty hybrid query must not return semantic results",
    );
  }

  /*
   * 8. A result retrieved by
   * multiple engines must be
   * deduplicated.
   */
  {
    const response =
      await searchHybrid(
        "GitHub software",
        memories,
        semanticIndex,
        {
          finalLimit:
            20,
        },
      );

    const ids =
      response.results.map(
        (result) =>
          result.memory.id,
      );

    const uniqueIds =
      new Set(ids);

    assert.equal(
      ids.length,
      uniqueIds.size,
      "hybrid results must not contain duplicate memories",
    );
  }

  /*
   * 9. Every final result must
   * preserve source information.
   */
  {
    const response =
      await searchHybrid(
        "software programming",
        memories,
        semanticIndex,
        {
          finalLimit:
            10,
        },
      );

    for (
      const result of
      response.results
    ) {
      assert.ok(
        result.sources.length >
          0,
        "every final result must identify at least one retrieval source",
      );

      assert.ok(
        Number.isFinite(
          result.score,
        ),
        "every final result must have a finite ranking score",
      );
    }
  }

    /*
   * 10. Semantic neighborhood
   * discovery must participate in
   * hybrid retrieval.
   *
   * This is the foundation for
   * generalized concept retrieval.
   */
    /*
 * 10. Semantic neighborhood
 * discovery must find a memory from
 * a conceptually related query even
 * when the exact query words are not
 * present in the memory.
 */
{
  const response =
    await searchHybrid(
      "fashion",
      memories,
      semanticIndex,
      {
        finalLimit:
          10,

        semanticNeighborLimit:
          10,

        semanticNeighborThreshold:
          0.20,
      },
    );

  assert.ok(
    response.semanticNeighborResults.length >
      0,
    "semantic neighborhood should discover fashion-related candidates",
  );

  assert.equal(
    response.semanticNeighborResults[0]?.memory.id,
    "pants-size",
    "fashion should discover the pant-size memory through semantic similarity",
  );
}
  
    /*
     * 11. Semantic neighborhood
     * candidates must be merged into
     * the final hybrid result without
     * creating duplicate memories.
     */
    {
      const response =
        await searchHybrid(
          "software",
          memories,
          semanticIndex,
          {
            finalLimit:
              20,
  
            semanticNeighborLimit:
              20,
          },
        );
  
      const ids =
        response.results.map(
          (result) =>
            result.memory.id,
        );
  
      assert.equal(
        ids.length,
        new Set(ids).size,
        "semantic neighborhood integration must not create duplicate results",
      );
    }
  
    /*
     * 12. Disabling semantic
     * neighborhoods must remove only
     * that candidate source.
     *
     * Existing exact/fuzzy/semantic
     * search must continue working.
     */
    {
      const response =
        await searchHybrid(
          "GitHub",
          memories,
          semanticIndex,
          {
            enableSemanticNeighbors:
              false,
  
            finalLimit:
              10,
          },
        );
  
      assert.deepEqual(
        response.semanticNeighborResults,
        [],
        "semantic neighborhood engine should be disabled",
      );
  
      assert.ok(
        response.exactResults.length >
          0,
        "exact search must continue when semantic neighborhoods are disabled",
      );
  
      assert.equal(
        response.results[0]?.memory.id,
        "github-exact",
        "disabling semantic neighborhoods must not affect exact-match dominance",
      );
    }
  
    /*
     * 13. Exact lexical relevance
     * must remain dominant even when
     * semantic-neighborhood candidates
     * are available.
     */
    {
      const response =
        await searchHybrid(
          "GitHub",
          memories,
          semanticIndex,
          {
            finalLimit:
              10,
  
            semanticNeighborLimit:
              20,
  
            semanticNeighborThreshold:
              0,
          },
        );
  
      assert.equal(
        response.results[0]?.memory.id,
        "github-exact",
        "exact result must remain first when semantic neighborhood candidates are present",
      );
    }

  console.log(
    "STEP 5.14E GENERAL SEMANTIC RETRIEVAL TESTS PASSED"
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