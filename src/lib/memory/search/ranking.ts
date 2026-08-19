import type {
    Memory,
  } from "@/types/memory";
  
  import type {
    ExactSearchField,
    ExactSearchResult,
  } from "@/lib/memory/search/exact-search";
  
  import type {
    FuzzySearchField,
    FuzzySearchResult,
  } from "@/lib/memory/search/fuzzy-search";
  
  export type SearchSource =
    | "exact"
    | "fuzzy"
    | "semantic";
  
  export type RankingMatch = {
    source: SearchSource;
    field:
      | ExactSearchField
      | FuzzySearchField
      | "semantic";
    score: number;
    similarity?: number;
  };
  
  export type SearchCandidate = {
    memory: Memory;
    exact?: ExactSearchResult;
    fuzzy?: FuzzySearchResult;
    semanticScore?: number;
  };
  
  export type RankedSearchResult = {
    memory: Memory;
    score: number;
    matches: RankingMatch[];
    sources: SearchSource[];
  };
  
  const SOURCE_WEIGHTS = {
    exact: 1.0,
    fuzzy: 0.65,
    semantic: 0.75,
  } as const;
  
  const FIELD_WEIGHTS = {
    description: 1.0,
    tag: 0.92,
    "attachment-name": 0.88,
    "metadata-key": 0.72,
    "metadata-value": 0.68,
    type: 0.62,
    content: 0.58,
    "attachment-type": 0.42,
    semantic: 0.9,
  } as const;
  
  const MAX_RECENCY_BONUS =
    0.08;
  
  const QUERY_COVERAGE_WEIGHT =
    0.12;
  
  function clamp(
    value: number,
    minimum = 0,
    maximum = 1,
  ): number {
    return Math.min(
      maximum,
      Math.max(
        minimum,
        value,
      ),
    );
  }
  
  function normalizeScore(
    score: number,
  ): number {
    if (
      !Number.isFinite(score) ||
      score <= 0
    ) {
      return 0;
    }
  
    return clamp(
      Math.log1p(score) /
        Math.log(101),
    );
  }
  
  function normalizeSemanticScore(
    score: number,
  ): number {
    if (
      !Number.isFinite(score)
    ) {
      return 0;
    }
  
    if (score < 0) {
      return clamp(
        (score + 1) / 2,
      );
    }
  
    return clamp(score);
  }

  function getSemanticConfidence(
    score: number,
  ): number {
    const similarity =
      normalizeSemanticScore(
        score,
      );
  
    /*
     * Very weak semantic associations
     * should contribute almost nothing.
     */
    if (
      similarity <= 0.25
    ) {
      return 0;
    }
  
    /*
     * Similarities around 0.45 and above
     * represent strong semantic evidence.
     */
    if (
      similarity >= 0.45
    ) {
      return 1;
    }
  
    /*
     * Smooth confidence curve from
     * 0.25 -> 0
     * 0.45 -> 1
     *
     * This preserves useful semantic-only
     * results such as:
     *
     * fashion -> pants ≈ 0.424
     *
     * while suppressing weak cross-domain
     * associations around 0.28-0.31.
     */
    const normalized =
      (similarity - 0.25) /
      0.20;
  
    /*
     * Smoothstep:
     *
     * 3x² - 2x³
     */
    return (
      normalized *
      normalized *
      (3 - 2 * normalized)
    );
  }
  
  function getFieldWeight(
    field:
      | ExactSearchField
      | FuzzySearchField
      | "semantic",
  ): number {
    return (
      FIELD_WEIGHTS[
        field
      ] ?? 0.5
    );
  }
  
  function getCandidateSourceScore(
    candidate: SearchCandidate,
  ): number {
    let weightedScore =
      0;
  
    if (
      candidate.exact
    ) {
      const normalized =
        normalizeScore(
          candidate.exact.score,
        );
  
      const strongestField =
        Math.max(
          ...candidate.exact.matches.map(
            (match) =>
              getFieldWeight(
                match.field,
              ),
          ),
          0,
        );
  
      weightedScore +=
        normalized *
        SOURCE_WEIGHTS.exact *
        Math.max(
          strongestField,
          0.5,
        );
    }
  
    if (
      candidate.fuzzy
    ) {
      const normalized =
        normalizeScore(
          candidate.fuzzy.score,
        );
  
      const strongestField =
        Math.max(
          ...candidate.fuzzy.matches.map(
            (match) =>
              getFieldWeight(
                match.field,
              ),
          ),
          0,
        );
  
      weightedScore +=
        normalized *
        SOURCE_WEIGHTS.fuzzy *
        Math.max(
          strongestField,
          0.5,
        );
    }
  
    if (
      candidate.semanticScore !==
      undefined
    ) {
      const semanticConfidence =
        getSemanticConfidence(
          candidate.semanticScore,
        );
    
      weightedScore +=
        semanticConfidence *
        SOURCE_WEIGHTS.semantic *
        FIELD_WEIGHTS.semantic;
    }
  
    return weightedScore;
  }
  
  function getBestFieldScore(
    candidate: SearchCandidate,
  ): number {
    const scores: number[] =
      [];
  
    if (
      candidate.exact
    ) {
      for (
        const match of
        candidate.exact.matches
      ) {
        scores.push(
          clamp(
            normalizeScore(
              match.score,
            ) *
              getFieldWeight(
                match.field,
              ),
          ),
        );
      }
    }
  
    if (
      candidate.fuzzy
    ) {
      for (
        const match of
        candidate.fuzzy.matches
      ) {
        scores.push(
          clamp(
            match.similarity *
              getFieldWeight(
                match.field,
              ),
          ),
        );
      }
    }
  
    if (
      candidate.semanticScore !==
      undefined
    ) {
      scores.push(
        getSemanticConfidence(
          candidate.semanticScore,
        ) *
          FIELD_WEIGHTS.semantic,
      );
    }
  
    return Math.max(
      ...scores,
      0,
    );
  }
  
  function getQueryCoverage(
    candidate: SearchCandidate,
  ): number {
    const coverageValues: number[] =
      [];
  
    if (
      candidate.exact
    ) {
      const matches =
        candidate.exact.matches;
  
      if (
        matches.length > 0
      ) {
        coverageValues.push(
          clamp(
            matches.length / 3,
          ),
        );
      }
    }
  
    if (
      candidate.fuzzy
    ) {
      const matches =
        candidate.fuzzy.matches;
  
      if (
        matches.length > 0
      ) {
        coverageValues.push(
          clamp(
            matches.length / 3,
          ),
        );
      }
    }
  
    if (
      candidate.semanticScore !==
      undefined
    ) {
      coverageValues.push(
        getSemanticConfidence(
          candidate.semanticScore,
        ),
      );
    }
  
    return Math.max(
      ...coverageValues,
      0,
    );
  }
  
  function parseDate(
    value: string,
  ): number {
    const timestamp =
      Date.parse(value);
  
    if (
      !Number.isFinite(
        timestamp,
      )
    ) {
      return 0;
    }
  
    return timestamp;
  }
  
  function getRecencyBonus(
    memory: Memory,
    now: number,
  ): number {
    const updatedAt =
      parseDate(
        memory.updatedAt,
      );
  
    const createdAt =
      parseDate(
        memory.createdAt,
      );
  
    const timestamp =
      Math.max(
        updatedAt,
        createdAt,
      );
  
    if (
      timestamp <= 0 ||
      now <= timestamp
    ) {
      return 0;
    }
  
    const ageDays =
      (now - timestamp) /
      (1000 * 60 * 60 * 24);
  
    const decay =
      Math.exp(
        -ageDays / 90,
      );
  
    return (
      clamp(decay) *
      MAX_RECENCY_BONUS
    );
  }
  
  function getExactDominance(
    candidate: SearchCandidate,
  ): number {
    if (
      !candidate.exact
    ) {
      return 0;
    }
  
    const hasFullFieldMatch =
      candidate.exact.matches.some(
        (match) =>
          match.score >=
          500,
      );
  
    return hasFullFieldMatch
      ? 0.45
      : 0.25;
  }
  
  function buildMatches(
    candidate: SearchCandidate,
  ): RankingMatch[] {
    const matches: RankingMatch[] =
      [];
  
    if (
      candidate.exact
    ) {
      for (
        const match of
        candidate.exact.matches
      ) {
        matches.push({
          source:
            "exact",
          field:
            match.field,
          score:
            match.score,
        });
      }
    }
  
    if (
      candidate.fuzzy
    ) {
      for (
        const match of
        candidate.fuzzy.matches
      ) {
        matches.push({
          source:
            "fuzzy",
          field:
            match.field,
          score:
            match.score,
          similarity:
            match.similarity,
        });
      }
    }
  
    if (
      candidate.semanticScore !==
      undefined
    ) {
      matches.push({
        source:
          "semantic",
        field:
          "semantic",
        score:
          candidate.semanticScore,
        similarity:
          normalizeSemanticScore(
            candidate.semanticScore,
          ),
      });
    }
  
    return matches;
  }
  
  function getSources(
    candidate: SearchCandidate,
  ): SearchSource[] {
    const sources: SearchSource[] =
      [];
  
    if (
      candidate.exact
    ) {
      sources.push(
        "exact",
      );
    }
  
    if (
      candidate.fuzzy
    ) {
      sources.push(
        "fuzzy",
      );
    }
  
    if (
      candidate.semanticScore !==
      undefined
    ) {
      sources.push(
        "semantic",
      );
    }
  
    return sources;
  }
  
  export function rankSearchCandidates(
    candidates: SearchCandidate[],
    now = Date.now(),
  ): RankedSearchResult[] {
    const ranked =
      candidates.map(
        (
          candidate,
          index,
        ) => {
          const sourceScore =
            getCandidateSourceScore(
              candidate,
            );
  
          const bestFieldScore =
            getBestFieldScore(
              candidate,
            );
  
          const queryCoverage =
            getQueryCoverage(
              candidate,
            );
  
          const recencyBonus =
            getRecencyBonus(
              candidate.memory,
              now,
            );
  
          const exactDominance =
            getExactDominance(
              candidate,
            );
  
          const score =
            sourceScore +
            bestFieldScore *
              0.35 +
            queryCoverage *
              QUERY_COVERAGE_WEIGHT +
            recencyBonus +
            exactDominance;
  
          return {
            memory:
              candidate.memory,
  
            score,
  
            matches:
              buildMatches(
                candidate,
              ),
  
            sources:
              getSources(
                candidate,
              ),
  
            index,
          };
        },
      );
  
    ranked.sort(
      (first, second) => {
        if (
          first.score !==
          second.score
        ) {
          return (
            second.score -
            first.score
          );
        }
  
        return (
          first.index -
          second.index
        );
      },
    );
  
    return ranked.map(
      ({
        memory,
        score,
        matches,
        sources,
      }) => ({
        memory,
        score,
        matches,
        sources,
      }),
    );
  }
  
  export function mergeSearchCandidates(
    exactResults: ExactSearchResult[],
    fuzzyResults: FuzzySearchResult[],
    semanticResults?: Array<{
      memory: Memory;
      score: number;
    }>,
  ): SearchCandidate[] {
    const candidates =
      new Map<
        string,
        SearchCandidate
      >();
  
    for (
      const result of
      exactResults
    ) {
      const existing =
        candidates.get(
          result.memory.id,
        );
  
      candidates.set(
        result.memory.id,
        {
          memory:
            result.memory,
  
          exact:
            result,
  
          fuzzy:
            existing?.fuzzy,
  
          semanticScore:
            existing?.semanticScore,
        },
      );
    }
  
    for (
      const result of
      fuzzyResults
    ) {
      const existing =
        candidates.get(
          result.memory.id,
        );
  
      candidates.set(
        result.memory.id,
        {
          memory:
            result.memory,
  
          exact:
            existing?.exact,
  
          fuzzy:
            result,
  
          semanticScore:
            existing?.semanticScore,
        },
      );
    }
  
    for (
      const result of
      semanticResults ?? []
    ) {
      const existing =
        candidates.get(
          result.memory.id,
        );
  
      candidates.set(
        result.memory.id,
        {
          memory:
            result.memory,
  
          exact:
            existing?.exact,
  
          fuzzy:
            existing?.fuzzy,
  
          semanticScore:
            result.score,
        },
      );
    }
  
    return [
      ...candidates.values(),
    ];
  }