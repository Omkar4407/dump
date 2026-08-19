import assert from "node:assert/strict";

import {
  searchMemoryResultsInVault,
} from "@/lib/memory/memory-service";

import type {
  Memory,
  Vault,
} from "@/types/memory";

function createMemory(
  overrides: Partial<Memory>,
): Memory {
  return {
    id: crypto.randomUUID(),
    type: "Text",
    data: "",
    description: "Test memory",
    tags: [],
    metadata: {},
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    ...overrides,
  };
}

const githubExact =
  createMemory({
    id: "github-exact",
    description:
      "GitHub",
    data:
      "Official GitHub project",
    tags: [
      "development",
    ],
  });

const githubTypo =
  createMemory({
    id: "github-typo",
    description:
      "Githb project notes",
    data:
      "Development notes",
    tags: [
      "development",
    ],
  });

const programmingMemory =
  createMemory({
    id: "programming",
    description:
      "Programming notes",
    data:
      "General software development",
    tags: [
      "programming",
    ],
  });

const unrelatedMemory =
  createMemory({
    id: "unrelated",
    description:
      "Cooking recipes",
    data:
      "Pasta and pizza recipes",
    tags: [
      "food",
    ],
  });

const credential =
  createMemory({
    id: "credential",
    type: "Credential",
    description:
      "GitHub account",
    data: JSON.stringify({
      name: "GitHub",
      username: "omkar",
      password:
        "SuperSecretPassword123",
    }),
    tags: [
      "github",
      "account",
    ],
  });

const vault: Vault = {
  version: 1,
  memories: [
    githubExact,
    githubTypo,
    programmingMemory,
    unrelatedMemory,
    credential,
  ],
};

function search(
  query: string,
) {
  return searchMemoryResultsInVault(
    vault,
    {
      query,
    },
  );
}

/*
 * 1. Exact search must work.
 */
{
  const results =
    search("GitHub");

  assert.ok(
    results.length > 0,
    "GitHub should produce results",
  );

  assert.equal(
    results[0]?.memory.id,
    "github-exact",
    "exact GitHub result should rank first",
  );

  assert.ok(
    results[0]?.matches.includes(
      "exact",
    ),
    "exact result must expose exact match context",
  );
}

/*
 * 2. Typo search must recover
 * the fuzzy candidate.
 */
{
  const results =
    search("Githb");

  assert.ok(
    results.some(
      (result) =>
        result.memory.id ===
        "github-typo",
    ),
    "Githb should recover the fuzzy GitHub memory",
  );
}

/*
 * 3. Exact result must dominate
 * fuzzy-only result.
 */
{
  const results =
    search("GitHub");

  const exactIndex =
    results.findIndex(
      (result) =>
        result.memory.id ===
        "github-exact",
    );

  const fuzzyIndex =
    results.findIndex(
      (result) =>
        result.memory.id ===
        "github-typo",
    );

  assert.notEqual(
    exactIndex,
    -1,
    "exact result must exist",
  );

  assert.notEqual(
    fuzzyIndex,
    -1,
    "fuzzy candidate must exist",
  );

  assert.ok(
    exactIndex <
      fuzzyIndex,
    "exact result must rank above fuzzy-only result",
  );
}

/*
 * 4. A memory returned by both
 * engines must appear exactly once.
 */
{
  const results =
    search("GitHub");

  const ids =
    results.map(
      (result) =>
        result.memory.id,
    );

  const githubExactCount =
    ids.filter(
      (id) =>
        id ===
        "github-exact",
    ).length;

  assert.equal(
    githubExactCount,
    1,
    "a memory must never appear twice",
  );
}

/*
 * 5. A memory matching exactly
 * and fuzzily should still expose
 * the exact signal.
 */
{
  const results =
    search("GitHub");

  const result =
    results.find(
      (item) =>
        item.memory.id ===
        "github-exact",
    );

  assert.ok(
    result,
    "GitHub exact result should exist",
  );

  assert.ok(
    result.matches.includes(
      "exact",
    ),
    "combined result must retain exact signal",
  );
}

/*
 * 6. Completely unrelated query
 * should not return unrelated
 * fuzzy noise.
 */
{
  const results =
    search(
      "zzzzxyz",
    );

  assert.equal(
    results.length,
    0,
    "unrelated query should return no results",
  );
}

/*
 * 7. Credential password must
 * remain outside fuzzy retrieval.
 */
{
  const results =
    search(
      "SuperSecretPassword123",
    );

  assert.ok(
    !results.some(
      (result) =>
        result.memory.id ===
        "credential",
    ),
    "credential password must never be searchable",
  );
}

/*
 * 8. Searching a safe credential
 * field must still find the
 * credential.
 */
{
  const results =
    search(
      "GitHub account",
    );

  assert.ok(
    results.some(
      (result) =>
        result.memory.id ===
        "credential",
    ),
    "credential should remain discoverable through safe metadata",
  );
}

/*
 * 9. Structural filters must
 * continue working with search.
 */
{
  const results =
    searchMemoryResultsInVault(
      vault,
      {
        query:
          "GitHub",
        type:
          "Credential",
      },
    );

  assert.ok(
    results.every(
      (result) =>
        result.memory.type ===
        "Credential",
    ),
    "type filter must be respected",
  );
}

/*
 * 10. Empty query should not
 * perform retrieval ranking.
 */
{
  const results =
    search("");

  assert.equal(
    results.length,
    vault.memories.length,
    "empty query should return all memories",
  );

  assert.ok(
    results.every(
      (result) =>
        result.score ===
        0,
    ),
    "empty query should have zero retrieval score",
  );
}

console.log(
  "STEP 5.10D SEARCH INTEGRATION TESTS PASSED",
);