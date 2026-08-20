import type {
  Memory,
} from "@/types/memory";

import {
  exactSearch,
  type ExactSearchResult,
} from "@/lib/memory/search/exact-search";

import {
  fuzzySearch,
  type FuzzySearchResult,
} from "@/lib/memory/search/fuzzy-search";

import {
  searchSemantic,
  discoverSemanticNeighbors,
  type SemanticSearchResult,
  type SemanticNeighbor,
} from "@/lib/memory/search/semantic-search";

import type {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  mergeSearchCandidates,
  rankSearchCandidates,
  type RankedSearchResult,
} from "@/lib/memory/search/ranking";

import {
  understandQuery,
  type QueryUnderstanding,
} from "@/lib/memory/search/query-understanding";

export type HybridSearchOptions = {
  exactLimit?: number;
  fuzzyLimit?: number;
  fuzzyThreshold?: number;
  semanticLimit?: number;
  semanticThreshold?: number;
  semanticNeighborLimit?: number;
  semanticNeighborThreshold?: number;
  finalLimit?: number;
  enableExact?: boolean;
  enableFuzzy?: boolean;
  enableSemantic?: boolean;
  enableSemanticNeighbors?: boolean;
};

export type HybridSearchResponse = {
  results: RankedSearchResult[];

  exactResults: ExactSearchResult[];

  fuzzyResults: FuzzySearchResult[];

  semanticResults: SemanticSearchResult[];

  semanticNeighborResults: SemanticNeighbor[];

  queryUnderstanding: QueryUnderstanding;
};

const DEFAULT_EXACT_LIMIT =
  50;

const DEFAULT_FUZZY_LIMIT =
  50;

const DEFAULT_FUZZY_THRESHOLD =
  0.72;

const DEFAULT_SEMANTIC_LIMIT =
  50;

const DEFAULT_SEMANTIC_THRESHOLD =
  0.35;

const DEFAULT_SEMANTIC_NEIGHBOR_LIMIT =
  20;

const DEFAULT_SEMANTIC_NEIGHBOR_THRESHOLD =
  0.20;

const DEFAULT_FINAL_LIMIT =
  20;

function normalizeLimit(
  value: number | undefined,
  fallback: number,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value),
  );
}

function normalizeThreshold(
  value: number | undefined,
  fallback: number,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    1,
    Math.max(
      0,
      value,
    ),
  );
}

function normalizeOptions(
  options?: HybridSearchOptions,
): Required<HybridSearchOptions> {
  return {
    exactLimit:
      normalizeLimit(
        options?.exactLimit,
        DEFAULT_EXACT_LIMIT,
      ),

    fuzzyLimit:
      normalizeLimit(
        options?.fuzzyLimit,
        DEFAULT_FUZZY_LIMIT,
      ),

    fuzzyThreshold:
      normalizeThreshold(
        options?.fuzzyThreshold,
        DEFAULT_FUZZY_THRESHOLD,
      ),

    semanticLimit:
      normalizeLimit(
        options?.semanticLimit,
        DEFAULT_SEMANTIC_LIMIT,
      ),

    semanticThreshold:
      normalizeThreshold(
        options?.semanticThreshold,
        DEFAULT_SEMANTIC_THRESHOLD,
      ),

    semanticNeighborLimit:
      normalizeLimit(
        options?.semanticNeighborLimit,
        DEFAULT_SEMANTIC_NEIGHBOR_LIMIT,
      ),

    semanticNeighborThreshold:
      normalizeThreshold(
        options?.semanticNeighborThreshold,
        DEFAULT_SEMANTIC_NEIGHBOR_THRESHOLD,
      ),

    finalLimit:
      normalizeLimit(
        options?.finalLimit,
        DEFAULT_FINAL_LIMIT,
      ),

    enableExact:
      options?.enableExact ??
      true,

    enableFuzzy:
      options?.enableFuzzy ??
      true,

    enableSemantic:
      options?.enableSemantic ??
      true,

    enableSemanticNeighbors:
      options?.enableSemanticNeighbors ??
      true,
  };
}

/*
 * Query intent controls candidate
 * discovery defaults only.
 *
 * It does NOT change the final
 * ranking weights.
 */
function getIntentDefaults(
  understanding: QueryUnderstanding,
): {
  semanticNeighborLimit: number;
  semanticNeighborThreshold: number;
} {
  switch (
    understanding.intent
  ) {
    case "conceptual":
      return {
        /*
         * Conceptual queries such as
         * "fashion", "travel", or
         * "programming" benefit from
         * broader semantic discovery.
         */
        semanticNeighborLimit: 30,
        semanticNeighborThreshold: 0.18,
      };

    case "natural-language":
      return {
        /*
         * Natural-language questions
         * can benefit from a larger
         * candidate pool.
         */
        semanticNeighborLimit: 30,
        semanticNeighborThreshold: 0.18,
      };

    case "lookup":
      return {
        /*
         * Short lookup queries should
         * retain a tighter semantic
         * neighborhood because exact
         * and fuzzy search are useful.
         */
        semanticNeighborLimit: 20,
        semanticNeighborThreshold: 0.20,
      };

    default:
      return {
        semanticNeighborLimit:
          DEFAULT_SEMANTIC_NEIGHBOR_LIMIT,

        semanticNeighborThreshold:
          DEFAULT_SEMANTIC_NEIGHBOR_THRESHOLD,
      };
  }
}

/*
 * Semantic confidence gate.
 *
 * Similarity scores are only meaningful
 * relative to each other. A query that
 * genuinely matches nothing still produces a
 * ranked list — every memory gets some score
 * — so an absolute threshold alone either
 * floods weak queries with noise or silences
 * strong ones.
 *
 * This keeps a semantically-discovered
 * candidate only when it stands out from the
 * rest of the vault for this particular
 * query: at least `SEMANTIC_STANDOUT_SIGMA`
 * standard deviations above the mean score,
 * and above an absolute floor.
 *
 * Candidates that also matched lexically are
 * unaffected — they carry their own evidence
 * and are merged separately.
 */

const SEMANTIC_ABSOLUTE_FLOOR = 0.18;

const SEMANTIC_STANDOUT_SIGMA = 0.3;

function selectConfidentSemanticCandidates(
  candidates: {
    memory: Memory;
    score: number;
  }[],
): {
  memory: Memory;
  score: number;
}[] {
  if (candidates.length === 0) {
    return [];
  }

  const scores = candidates.map(
    (candidate) => candidate.score,
  );

  const mean =
    scores.reduce(
      (total, score) => total + score,
      0,
    ) / scores.length;

  const variance =
    scores.reduce(
      (total, score) =>
        total + (score - mean) ** 2,
      0,
    ) / scores.length;

  const deviation = Math.sqrt(variance);

  const standoutFloor =
    mean + SEMANTIC_STANDOUT_SIGMA * deviation;

  const floor = Math.max(
    SEMANTIC_ABSOLUTE_FLOOR,
    standoutFloor,
  );

  return candidates.filter(
    (candidate) => candidate.score >= floor,
  );
}

export async function searchHybrid(
  query: string,
  memories: Memory[],
  semanticIndex: SemanticIndex,
  options?: HybridSearchOptions,
): Promise<HybridSearchResponse> {
  const normalizedQuery =
    query.trim();

  if (
    !normalizedQuery
  ) {
    return {
      results: [],
      exactResults: [],
      fuzzyResults: [],
      semanticResults: [],
      semanticNeighborResults: [],
      queryUnderstanding:
        understandQuery(query),
    };
  }

  const understanding =
    understandQuery(
      normalizedQuery,
    );

  const normalized =
    normalizeOptions(
      options,
    );

  const intentDefaults =
    getIntentDefaults(
      understanding,
    );

  /*
   * Explicit caller options always
   * win over intent-derived defaults.
   */
  const semanticNeighborLimit =
    options?.semanticNeighborLimit !==
    undefined
      ? normalized.semanticNeighborLimit
      : intentDefaults.semanticNeighborLimit;

  const semanticNeighborThreshold =
    options?.semanticNeighborThreshold !==
    undefined
      ? normalized.semanticNeighborThreshold
      : intentDefaults.semanticNeighborThreshold;

  let exactResults:
    ExactSearchResult[] =
    [];

  let fuzzyResults:
    FuzzySearchResult[] =
    [];

  let semanticResults:
    SemanticSearchResult[] =
    [];

  let semanticNeighborResults:
    SemanticNeighbor[] =
    [];

  /*
   * EXACT SEARCH
   */
  if (
    normalized.enableExact
  ) {
    exactResults =
      exactSearch(
        memories,
        normalizedQuery,
      );

    exactResults =
      exactResults.slice(
        0,
        normalized.exactLimit,
      );
  }

  /*
   * FUZZY SEARCH
   */
  if (
    normalized.enableFuzzy
  ) {
    fuzzyResults =
      fuzzySearch(
        memories,
        normalizedQuery,
        {
          threshold:
            normalized.fuzzyThreshold,
        },
      );

    fuzzyResults =
      fuzzyResults.slice(
        0,
        normalized.fuzzyLimit,
      );
  }

  /*
   * DIRECT SEMANTIC SEARCH
   */
  if (
    normalized.enableSemantic
  ) {
    semanticResults =
      await searchSemantic(
        normalizedQuery,
        memories,
        semanticIndex,
        {
          threshold:
            normalized.semanticThreshold,

          limit:
            normalized.semanticLimit,
        },
      );
  }

  /*
   * SEMANTIC NEIGHBOR DISCOVERY
   *
   * Intent changes only the
   * candidate-discovery defaults.
   */
  if (
    normalized.enableSemanticNeighbors
  ) {
    semanticNeighborResults =
      await discoverSemanticNeighbors(
        normalizedQuery,
        memories,
        semanticIndex,
        {
          limit:
            semanticNeighborLimit,

          minimumScore:
            semanticNeighborThreshold,
        },
      );
  }

  /*
   * MERGE ALL SEARCH SOURCES
   */
  const semanticCandidates = [
    ...semanticResults.map(
      (
        result,
      ) => ({
        memory:
          result.memory,

        score:
          result.score,
      }),
    ),

    ...semanticNeighborResults.map(
      (
        result,
      ) => ({
        memory:
          result.memory,

        score:
          result.score,
      }),
    ),
  ];

  const candidates =
    mergeSearchCandidates(
      exactResults,
      fuzzyResults,
      selectConfidentSemanticCandidates(
        semanticCandidates,
      ),
    );

  /*
   * FINAL HEURISTIC RANKING
   */
  const ranked =
    rankSearchCandidates(
      candidates,
    );

  return {
    results:
      ranked.slice(
        0,
        normalized.finalLimit,
      ),

    exactResults,

    fuzzyResults,

    semanticResults,

    semanticNeighborResults,

    queryUnderstanding:
      understanding,
  };
}