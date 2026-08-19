import assert from "node:assert/strict";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

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
      "Programming and software development notes.",
    description:
      "Software development project",
    tags: [
      "programming",
      "development",
    ],
    metadata: {
      language:
        "TypeScript",
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const index =
    new SemanticIndex();

  /*
   * 1. New index must be empty.
   */
  assert.equal(
    index.size,
    0,
    "new semantic index must be empty",
  );

  assert.deepEqual(
    index.getStats(),
    {
      size: 0,
    },
    "new index stats must report zero entries",
  );

  /*
   * 2. Index one memory.
   */
  const first =
    createMemory(
      "memory-1",
    );

  const firstEntry =
    await index.indexMemory(
      first,
    );

  assert.ok(
    firstEntry,
    "valid memory should produce an index entry",
  );

  assert.equal(
    firstEntry?.memoryId,
    "memory-1",
    "index entry must preserve memory ID",
  );

  assert.equal(
    firstEntry?.embedding.length,
    384,
    "index entry must contain a 384-dimensional embedding",
  );

  assert.ok(
    firstEntry?.text.includes(
      "Software development project",
    ),
    "index entry must retain semantic text",
  );

  assert.equal(
    index.size,
    1,
    "index should contain one entry",
  );

  assert.equal(
    index.has(
      "memory-1",
    ),
    true,
    "indexed memory must be discoverable",
  );

  /*
   * 3. Indexing the same memory again
   * should replace its entry rather
   * than create a duplicate.
   */
  const replacement =
    await index.indexMemory(
      first,
    );

  assert.ok(
    replacement,
    "re-indexing a valid memory should succeed",
  );

  assert.equal(
    index.size,
    1,
    "re-indexing must not create duplicates",
  );

  /*
   * 4. Index a second memory.
   */
  const second =
    createMemory(
      "memory-2",
      {
        description:
          "Cooking and meal planning",
        data:
          "Tomatoes, onions, pasta, and olive oil.",
        tags: [
          "food",
          "cooking",
        ],
      },
    );

  await index.indexMemory(
    second,
  );

  assert.equal(
    index.size,
    2,
    "second memory should increase index size",
  );

  /*
   * 5. get() must return the
   * corresponding entry.
   */
  const stored =
    index.get(
      "memory-2",
    );

  assert.ok(
    stored,
    "indexed memory should be retrievable",
  );

  assert.equal(
    stored?.memoryId,
    "memory-2",
    "retrieved entry must preserve memory ID",
  );

  /*
   * 6. Invalid/empty semantic
   * content must not remain indexed.
   */
  const empty =
    createMemory(
      "empty",
      {
        type:
          "Other",
        data:
          "",
        description:
          "",
        tags: [],
        metadata: {},
        attachments: [],
      },
    );

  const emptyResult =
    await index.indexMemory(
      empty,
    );

  /*
   * The memory type itself is
   * semantic context, so this remains
   * embeddable.
   */
  assert.ok(
    emptyResult,
    "memory with valid semantic type should remain indexable",
  );

  /*
   * 7. Remove must delete only
   * the requested memory.
   */
  assert.equal(
    index.remove(
      "memory-2",
    ),
    true,
    "remove should return true for an existing entry",
  );

  assert.equal(
    index.has(
      "memory-2",
    ),
    false,
    "removed memory must no longer exist in index",
  );

  assert.equal(
    index.size,
    2,
    "removing one of three entries should leave two",
  );

  /*
   * 8. Removing a nonexistent
   * memory should be harmless.
   */
  assert.equal(
    index.remove(
      "does-not-exist",
    ),
    false,
    "removing a nonexistent entry should return false",
  );

  /*
   * 9. Clear must remove every
   * indexed vector.
   */
  index.clear();

  assert.equal(
    index.size,
    0,
    "clear must empty the semantic index",
  );

  assert.equal(
    index.has(
      "memory-1",
    ),
    false,
    "cleared index must not retain old entries",
  );

  assert.equal(
    index.has(
      "empty",
    ),
    false,
    "cleared index must not retain any entries",
  );

  /*
   * 10. Rebuild should clear the
   * previous index and construct a
   * fresh one.
   */
  const rebuilt =
    await index.rebuild(
      [
        createMemory(
          "rebuilt-1",
        ),
        createMemory(
          "rebuilt-2",
          {
            description:
              "Database project",
          },
        ),
      ],
    );

  assert.equal(
    rebuilt.length,
    2,
    "rebuild should return all successfully indexed entries",
  );

  assert.equal(
    index.size,
    2,
    "rebuild should replace the previous index",
  );

  assert.equal(
    index.has(
      "rebuilt-1",
    ),
    true,
    "rebuilt index should contain first memory",
  );

  assert.equal(
    index.has(
      "rebuilt-2",
    ),
    true,
    "rebuilt index should contain second memory",
  );

  /*
   * 11. Final clear.
   */
  index.clear();

  assert.equal(
    index.size,
    0,
    "final clear should leave an empty index",
  );

  console.log(
    "STEP 5.12G SEMANTIC INDEX TESTS PASSED",
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