import assert from "node:assert/strict";

import { SemanticIndex } from "@/lib/memory/search/semantic-index";

import { searchHybrid } from "@/lib/memory/search/hybrid-search";

import {
  EVAL_CASES,
  EVAL_MEMORIES,
} from "@/lib/memory/search/retrieval-eval";

import { exactSearch } from "@/lib/memory/search/exact-search";

import { fuzzySearch } from "@/lib/memory/search/fuzzy-search";

import { getSearchableCredentialText } from "@/lib/memory/search/credential-fields";

import {
  buildSemanticFacets,
  buildSemanticText,
} from "@/lib/memory/search/semantic-text";

/*
 * End-to-end retrieval quality guard.
 *
 * The other search tests assert behaviour of
 * individual stages. This one measures the
 * whole pipeline against a realistic vault and
 * fails if overall quality regresses.
 *
 * Thresholds sit deliberately below the
 * measured figures so ordinary model or
 * tuning noise does not make the suite
 * flaky — they catch real regressions, not
 * decimal drift.
 *
 * Measured at the time of writing:
 *
 *   Recall@5     90.8%
 *   Precision@5  67.6%
 *   MRR          0.967
 *   Misses       1 / 30
 */

const TOP_K = 5;

const MINIMUM_RECALL = 0.82;

const MINIMUM_PRECISION = 0.58;

const MINIMUM_MRR = 0.9;

const MAXIMUM_MISSES = 3;

async function main(): Promise<void> {
  const index = new SemanticIndex();

  await index.rebuild(EVAL_MEMORIES);

  let totalRecall = 0;

  let totalPrecision = 0;

  let totalReciprocalRank = 0;

  let misses = 0;

  for (const testCase of EVAL_CASES) {
    const response = await searchHybrid(
      testCase.query,
      EVAL_MEMORIES,
      index,
      {
        exactLimit: 50,
        fuzzyLimit: 50,
        fuzzyThreshold: 0.72,
        semanticLimit: 50,
        semanticThreshold: 0.35,
        finalLimit: 50,
        enableExact: true,
        enableFuzzy: true,
        enableSemantic: true,
      },
    );

    const returned = response.results.map(
      (result) => result.memory.id,
    );

    const top = returned.slice(0, TOP_K);

    const hits = testCase.relevant.filter(
      (id) => top.includes(id),
    ).length;

    const firstRelevantIndex = returned.findIndex(
      (id) => testCase.relevant.includes(id),
    );

    const recall =
      hits / testCase.relevant.length;

    totalRecall += recall;

    totalPrecision +=
      top.length === 0 ? 1 : hits / top.length;

    totalReciprocalRank +=
      firstRelevantIndex === -1
        ? 0
        : 1 / (firstRelevantIndex + 1);

    if (recall === 0) {
      misses += 1;
    }
  }

  const meanRecall =
    totalRecall / EVAL_CASES.length;

  const meanPrecision =
    totalPrecision / EVAL_CASES.length;

  const meanReciprocalRank =
    totalReciprocalRank / EVAL_CASES.length;

  assert.ok(
    meanRecall >= MINIMUM_RECALL,
    `Recall@${TOP_K} regressed: ${(meanRecall * 100).toFixed(1)}% is below the ${(MINIMUM_RECALL * 100).toFixed(0)}% floor`,
  );

  assert.ok(
    meanPrecision >= MINIMUM_PRECISION,
    `Precision@${TOP_K} regressed: ${(meanPrecision * 100).toFixed(1)}% is below the ${(MINIMUM_PRECISION * 100).toFixed(0)}% floor`,
  );

  assert.ok(
    meanReciprocalRank >= MINIMUM_MRR,
    `MRR regressed: ${meanReciprocalRank.toFixed(3)} is below the ${MINIMUM_MRR} floor`,
  );

  assert.ok(
    misses <= MAXIMUM_MISSES,
    `Too many queries returned nothing relevant: ${misses} (limit ${MAXIMUM_MISSES})`,
  );

  /*
   * Behaviours the product explicitly
   * promises, checked individually so a
   * good average cannot hide them failing.
   */
  const promised: {
    query: string;
    mustInclude: string;
  }[] = [
    {
      query: "github password",
      mustInclude: "github-login",
    },
    {
      query: "netflix",
      mustInclude: "netflix-login",
    },
    {
      query: "clothes",
      mustInclude: "pant-size",
    },
    {
      query: "software development",
      mustInclude: "debounce-snippet",
    },
    {
      query: "biriyani",
      mustInclude: "biryani-recipe",
    },
  ];

  for (const expectation of promised) {
    const response = await searchHybrid(
      expectation.query,
      EVAL_MEMORIES,
      index,
      {
        finalLimit: TOP_K,
        enableExact: true,
        enableFuzzy: true,
        enableSemantic: true,
      },
    );

    const returned = response.results.map(
      (result) => result.memory.id,
    );

    assert.ok(
      returned.includes(expectation.mustInclude),
      `"${expectation.query}" must retrieve "${expectation.mustInclude}" (got: ${returned.join(", ") || "nothing"})`,
    );
  }

  /*
   * SECURITY.
   *
   * The boundary is that a credential secret
   * never enters any searchable or indexed
   * representation, and never produces a
   * lexical match.
   *
   * Note this is deliberately not "a query
   * containing the password returns no
   * credential": the word "password" is
   * itself semantically close to credentials,
   * and it must stay that way for "wifi
   * password" to work at all.
   */
  {
    const secret = "Zq7VaultSecret9931";

    const credentials = EVAL_MEMORIES.filter(
      (memory) => memory.type === "Credential",
    );

    assert.ok(
      credentials.length > 0,
      "the corpus must contain credentials to test",
    );

    for (const credential of credentials) {
      assert.ok(
        credential.data.includes(secret),
        `test fixture "${credential.id}" must actually hold the secret`,
      );

      assert.ok(
        !getSearchableCredentialText(
          credential,
        ).includes(secret),
        `credential "${credential.id}" must not expose its password to lexical search`,
      );

      assert.ok(
        !buildSemanticText(
          credential,
        ).includes(secret),
        `credential "${credential.id}" must not embed its password`,
      );

      for (
        const facet of buildSemanticFacets(
          credential,
        )
      ) {
        assert.ok(
          !facet.includes(secret),
          `credential "${credential.id}" must not embed its password in a facet`,
        );
      }
    }

    const credentialIds = credentials.map(
      (credential) => credential.id,
    );

    const lexical = [
      ...exactSearch(EVAL_MEMORIES, secret),
      ...fuzzySearch(EVAL_MEMORIES, secret, {
        threshold: 0.72,
      }),
    ];

    for (const result of lexical) {
      assert.ok(
        !credentialIds.includes(result.memory.id),
        `credential "${result.memory.id}" must never be found by its password`,
      );
    }
  }

  console.log(
    `RETRIEVAL BENCHMARK PASSED — recall ${(meanRecall * 100).toFixed(1)}%, precision ${(meanPrecision * 100).toFixed(1)}%, MRR ${meanReciprocalRank.toFixed(3)}, misses ${misses}/${EVAL_CASES.length}`,
  );
}

main().catch((error) => {
  console.error(error);

  process.exitCode = 1;
});
