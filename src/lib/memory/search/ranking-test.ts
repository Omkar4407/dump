import assert from "node:assert/strict";

import {
  mergeSearchCandidates,
  rankSearchCandidates,
} from "@/lib/memory/search/ranking";

import type {
  ExactSearchResult,
} from "@/lib/memory/search/exact-search";

import type {
  FuzzySearchResult,
} from "@/lib/memory/search/fuzzy-search";

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
    data: "",
    description: id,
    tags: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function exactResult(
  memory: Memory,
  score: number,
  field:
    | ExactSearchResult["matches"][number]["field"] = "description",
): ExactSearchResult {
  return {
    memory,
    score,
    matches: [
      {
        field,
        score,
      },
    ],
  };
}

function fuzzyResult(
  memory: Memory,
  score: number,
  similarity: number,
  field:
    | FuzzySearchResult["matches"][number]["field"] = "description",
): FuzzySearchResult {
  return {
    memory,
    score,
    matches: [
      {
        field,
        score,
        similarity,
      },
    ],
  };
}

/*
 * 1. Exact retrieval must dominate
 * fuzzy retrieval.
 */
{
  const exactMemory =
    createMemory(
      "exact",
      {
        description:
          "GitHub",
      },
    );

  const fuzzyMemory =
    createMemory(
      "fuzzy",
      {
        description:
          "Githb project",
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          exactMemory,
          1000,
        ),
      ],
      [
        fuzzyResult(
          fuzzyMemory,
          100,
          0.99,
        ),
      ],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "exact",
    "exact retrieval must rank above fuzzy retrieval",
  );
}

/*
 * 2. Full-field exact match must
 * dominate a weaker phrase match.
 */
{
  const fullField =
    createMemory(
      "full-field",
      {
        description:
          "machine learning",
      },
    );

  const phrase =
    createMemory(
      "phrase",
      {
        description:
          "machine learning project notes",
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          fullField,
          1000,
        ),
        exactResult(
          phrase,
          180,
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "full-field",
    "full-field exact match must rank above phrase match",
  );
}

/*
 * 3. Description should beat a
 * weaker content match when the
 * lexical evidence is comparable.
 */
{
  const descriptionMemory =
    createMemory(
      "description",
      {
        description:
          "Project",
      },
    );

  const contentMemory =
    createMemory(
      "content",
      {
        description:
          "Project notes",
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          descriptionMemory,
          100,
          "description",
        ),
        exactResult(
          contentMemory,
          100,
          "content",
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "description",
    "description should receive stronger field weighting than content",
  );
}

/*
 * 4. Multiple retrieval signals
 * should strengthen a candidate.
 */
{
  const hybridMemory =
    createMemory(
      "hybrid",
    );

  const exactOnlyMemory =
    createMemory(
      "exact-only",
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          hybridMemory,
          150,
        ),
        exactResult(
          exactOnlyMemory,
          150,
        ),
      ],
      [
        fuzzyResult(
          hybridMemory,
          100,
          0.9,
        ),
      ],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "hybrid",
    "a candidate supported by multiple retrieval signals should receive a ranking boost",
  );
}

/*
 * 5. Semantic similarity must not
 * automatically overpower a strong
 * exact result.
 */
{
  const exactMemory =
    createMemory(
      "exact",
    );

  const semanticMemory =
    createMemory(
      "semantic",
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          exactMemory,
          1000,
        ),
      ],
      [],
      [
        {
          memory:
            semanticMemory,
          score: 0.99,
        },
      ],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "exact",
    "very high semantic similarity must not bury a strong exact result",
  );
}

/*
 * 6. Semantic retrieval should
 * still work when there is no
 * lexical match.
 */
{
  const semanticMemory =
    createMemory(
      "semantic-only",
    );

  const candidates =
    mergeSearchCandidates(
      [],
      [],
      [
        {
          memory:
            semanticMemory,
          score: 0.88,
        },
      ],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked.length,
    1,
    "semantic-only candidate should be rankable",
  );

  assert.equal(
    ranked[0]?.memory.id,
    "semantic-only",
    "semantic-only candidate should remain discoverable",
  );

  assert.ok(
    ranked[0]?.sources.includes(
      "semantic",
    ),
    "semantic source should be preserved",
  );
}

/*
 * 7. Recency should provide only
 * a small boost.
 */
{
  const recent =
    createMemory(
      "recent",
      {
        updatedAt:
          new Date().toISOString(),
      },
    );

  const old =
    createMemory(
      "old",
      {
        updatedAt:
          new Date(
            Date.now() -
              365 *
                24 *
                60 *
                60 *
                1000,
          ).toISOString(),
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          recent,
          100,
        ),
        exactResult(
          old,
          100,
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "recent",
    "recent memory should receive a small freshness advantage",
  );
}

/*
 * 8. Recency must not overpower
 * a substantially stronger result.
 */
{
  const recentWeak =
    createMemory(
      "recent-weak",
      {
        updatedAt:
          new Date().toISOString(),
      },
    );

  const oldStrong =
    createMemory(
      "old-strong",
      {
        updatedAt:
          new Date(
            Date.now() -
              365 *
                24 *
                60 *
                60 *
                1000,
          ).toISOString(),
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          recentWeak,
          50,
        ),
        exactResult(
          oldStrong,
          1000,
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "old-strong",
    "recency must never overpower substantially stronger relevance",
  );
}

/*
 * 9. Duplicate memories from
 * multiple retrieval engines must
 * be merged into one candidate.
 */
{
  const memory =
    createMemory(
      "duplicate",
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          memory,
          100,
        ),
      ],
      [
        fuzzyResult(
          memory,
          80,
          0.9,
        ),
      ],
      [
        {
          memory,
          score: 0.85,
        },
      ],
    );

  assert.equal(
    candidates.length,
    1,
    "same memory must only appear once in candidate set",
  );

  assert.ok(
    candidates[0]?.exact,
    "exact signal must be preserved",
  );

  assert.ok(
    candidates[0]?.fuzzy,
    "fuzzy signal must be preserved",
  );

  assert.equal(
    candidates[0]?.semanticScore,
    0.85,
    "semantic signal must be preserved",
  );
}

/*
 * 10. Credential data must never
 * enter the ranking layer through
 * lexical retrieval.
 *
 * The ranker itself only consumes
 * retrieval candidates, so this
 * test verifies that safe exact
 * metadata can still be ranked.
 */
{
  const credential =
    createMemory(
      "credential",
      {
        type:
          "Credential",
        description:
          "GitHub account",
        data:
          "SuperSecretPassword123",
        tags: [
          "github",
        ],
      },
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          credential,
          100,
          "description",
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked.length,
    1,
    "safe credential metadata should remain rankable",
  );

  assert.equal(
    ranked[0]?.memory.id,
    "credential",
    "credential should be ranked using safe retrieval evidence",
  );
}

/*
 * 11. Sources must accurately
 * describe how a result was found.
 */
{
  const memory =
    createMemory(
      "multi-source",
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          memory,
          500,
        ),
      ],
      [
        fuzzyResult(
          memory,
          100,
          0.8,
        ),
      ],
      [
        {
          memory,
          score: 0.9,
        },
      ],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.deepEqual(
    ranked[0]?.sources,
    [
      "exact",
      "fuzzy",
      "semantic",
    ],
    "all retrieval sources must be preserved",
  );
}

/*
 * 12. Ranking must be deterministic.
 */
{
  const first =
    createMemory(
      "first",
    );

  const second =
    createMemory(
      "second",
    );

  const candidates =
    mergeSearchCandidates(
      [
        exactResult(
          first,
          100,
        ),
        exactResult(
          second,
          100,
        ),
      ],
      [],
    );

  const ranked =
    rankSearchCandidates(
      candidates,
      Date.now(),
    );

  assert.equal(
    ranked[0]?.memory.id,
    "first",
    "ties must preserve deterministic candidate order",
  );

  assert.equal(
    ranked[1]?.memory.id,
    "second",
    "ties must preserve deterministic candidate order",
  );
}

console.log(
  "STEP 5.11B HEURISTIC RANKING TESTS PASSED",
);