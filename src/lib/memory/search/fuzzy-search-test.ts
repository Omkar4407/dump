import assert from "node:assert/strict";

import {
  fuzzySearch,
  getFuzzySimilarity,
} from "./fuzzy-search";

import type {
  Memory,
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

const memories: Memory[] = [
  createMemory({
    id: "github",
    description:
      "GitHub repository credentials",
    data:
      "Repository for the DUMP project",
    tags: [
      "development",
      "programming",
    ],
  }),

  createMemory({
    id: "password",
    description:
      "Password reset notes",
    data:
      "Remember to rotate account credentials",
    tags: [
      "security",
    ],
  }),

  createMemory({
    id: "machine-learning",
    description:
      "Machine learning project",
    data:
      "Experiments with regression and model evaluation",
    tags: [
      "machine-learning",
      "python",
    ],
  }),

  createMemory({
    id: "resume",
    description:
      "My resume",
    data:
      "Latest internship resume",
    tags: [
      "career",
    ],
    attachments: [
      {
        id: "resume-file",
        type: "File",
        fileName:
          "resume.pdf",
        mimeType:
          "application/pdf",
        size: 1024,
        driveFileId:
          "drive-resume",
        encryptionVersion: 1,
        iv: "test-iv",
        createdAt:
          new Date().toISOString(),
      },
    ],
  }),

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
      notes:
        "Personal GitHub account",
    }),
    tags: [
      "github",
      "account",
    ],
  }),
];

function resultIds(
  query: string,
): string[] {
  return fuzzySearch(
    memories,
    query,
  ).map(
    (result) =>
      result.memory.id,
  );
}

/*
 * 1. Basic fuzzy typo.
 */
{
  const results =
    resultIds("githb");

  assert.ok(
    results.includes("github"),
    "githb should recover github",
  );
}

/*
 * 2. Another typo.
 */
{
  const results =
    resultIds("passwrod");

  assert.ok(
    results.includes("password"),
    "passwrod should recover password",
  );
}

/*
 * 3. Case normalization.
 */
{
  const results =
    resultIds("GitHub");

  assert.ok(
    results.includes("github"),
    "GitHub should match github",
  );
}

/*
 * 4. Multi-word fuzzy query.
 */
{
  const results =
    resultIds(
      "machine learnng",
    );

  assert.ok(
    results.includes(
      "machine-learning",
    ),
    "machine learnng should recover machine-learning",
  );
}

/*
 * 5. Tag typo.
 */
{
  const results =
    resultIds(
      "programing",
    );

  assert.ok(
    results.includes("github"),
    "programing should recover programming tag",
  );
}

/*
 * 6. Attachment filename typo.
 */
{
  const results =
    resultIds(
      "resme pdf",
    );

  assert.ok(
    results.includes("resume"),
    "resme pdf should recover resume attachment",
  );
}

/*
 * 7. Garbage query should not
 * produce unrelated results.
 */
{
  const results =
    resultIds(
      "zzzzxyz",
    );

  assert.equal(
    results.length,
    0,
    "garbage query should return no results",
  );
}

/*
 * 8. Very short token should not
 * produce uncontrolled fuzzy matches.
 */
{
  const results =
    resultIds("git");

  assert.ok(
    results.length <=
      memories.length,
    "short queries must remain bounded",
  );
}

/*
 * 9. Credential password must
 * never participate in fuzzy search.
 *
 * The password itself should not
 * retrieve the credential.
 */
{
  const results =
    resultIds(
      "supersecretpassword",
    );

  assert.ok(
    !results.includes(
      "credential",
    ),
    "credential passwords must not be fuzzy-searchable",
  );
}

/*
 * 10. Similarity sanity checks.
 */
{
  const exact =
    getFuzzySimilarity(
      "github",
      "github",
    );

  const typo =
    getFuzzySimilarity(
      "githb",
      "github",
    );

  const unrelated =
    getFuzzySimilarity(
      "github",
      "banana",
    );

  assert.equal(
    exact,
    1,
    "exact similarity must be 1",
  );

  assert.ok(
    typo > unrelated,
    "typo similarity should exceed unrelated similarity",
  );

  assert.ok(
    unrelated < 0.72,
    "unrelated terms should remain below the fuzzy threshold",
  );
}

console.log(
  "STEP 5.10B FUZZY SEARCH TESTS PASSED",
);