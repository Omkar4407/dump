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
      "pants",
      {
        description: "Pant size",
        data: "waist - 34 inches",
        tags: [
          "clothing",
          "measurements",
        ],
      },
    ),

    createMemory(
      "cooking",
      {
        description: "Cooking recipes",
        data:
          "Tomatoes, onions, pasta, herbs, spices and olive oil.",
        tags: [
          "food",
          "cooking",
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
      "college",
      {
        description:
          "College project",
        data:
          "Software project and college assignment notes.",
        tags: [
          "college",
          "project",
        ],
      },
    ),

    createMemory(
      "github",
      {
        type: "Credential",
        description:
          "GitHub Account",
        data:
          JSON.stringify({
            name: "GitHub",
            username:
              "example@example.com",
            password:
              "secret-password",
            notes:
              "Personal account",
          }),
        tags: [
          "coding",
          "work",
        ],
      },
    ),
  ];

  const semanticIndex =
    new SemanticIndex();

  await semanticIndex.rebuild(
    memories,
  );

  async function inspect(
    query: string,
  ) {
    const response =
      await searchHybrid(
        query,
        memories,
        semanticIndex,
        {
          finalLimit: 20,
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

    return response;
  }

  /*
   * 1. Strong semantic concept.
   */
  {
    const response =
      await inspect(
        "fashion",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "pants",
      ),
      "fashion should retrieve the pants memory",
    );
  }

  /*
   * 2. Strong cooking concept.
   */
  {
    const response =
      await inspect(
        "food",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "cooking",
      ),
      "food should retrieve the cooking memory",
    );
  }

  /*
   * 3. Strong programming concept.
   */
  {
    const response =
      await inspect(
        "programming",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "programming",
      ),
      "programming should retrieve programming memory",
    );
  }

  /*
   * 4. Strong travel concept.
   */
  {
    const response =
      await inspect(
        "travel",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "travel",
      ),
      "travel should retrieve travel memory",
    );
  }

  /*
   * 5. Strong personal concept.
   */
  {
    const response =
      await inspect(
        "birthday",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "birthday",
      ),
      "birthday should retrieve birthday memory",
    );
  }

  /*
   * 6. Strong college concept.
   */
  {
    const response =
      await inspect(
        "college",
      );

    assert.ok(
      response.results.some(
        (result) =>
          result.memory.id ===
          "college",
      ),
      "college should retrieve college memory",
    );
  }

  /*
   * 7. Credential-oriented query.
   *
   * The credential memory may be
   * retrieved because of its description
   * and tags, but its protected data
   * must never become semantic source
   * text.
   */
  {
    const response =
      await inspect(
        "GitHub password",
      );

    const github =
      response.results.find(
        (result) =>
          result.memory.id ===
          "github",
      );

    assert.ok(
      github,
      "GitHub password query should retrieve the GitHub credential",
    );

    const semanticCredential =
      response.semanticResults.find(
        (result) =>
          result.memory.id ===
          "github",
      );

    if (
      semanticCredential
    ) {
      assert.ok(
        !semanticCredential.entry.text.includes(
          "secret-password",
        ),
        "credential secret must never appear in semantic index text",
      );
    }
  }

  /*
   * 8. Inspect weak cross-domain
   * candidates.
   *
   * We do not assert that unrelated
   * semantic candidates must disappear
   * yet. This is a diagnostic stage.
   */
  {
    const response =
      await inspect(
        "fashion",
      );

    const pants =
      response.results.find(
        (result) =>
          result.memory.id ===
          "pants",
      );

    assert.ok(
      pants,
      "pants result must remain available",
    );

    const unrelated =
      response.results.filter(
        (result) =>
          result.memory.id !==
          "pants",
      );

    console.log(
      "WEAK CANDIDATES:",
      unrelated.map(
        (result) => ({
          id:
            result.memory.id,
          score:
            Number(
              result.score.toFixed(
                4,
              ),
            ),
        }),
      ),
    );
  }

  console.log(
    "\nSTEP 5.15D SEMANTIC CONFIDENCE TESTS PASSED",
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);