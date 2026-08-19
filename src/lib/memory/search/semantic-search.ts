import type {
  Memory,
} from "@/types/memory";

import {
  cosineSimilarity,
  generateEmbedding,
} from "@/lib/memory/search/embedding";

import {
    expandSemanticQuery,
  } from "@/lib/memory/search/semantic-query-expansion";

import type {
  SemanticIndex,
  SemanticIndexEntry,
} from "@/lib/memory/search/semantic-index";

export type SemanticSearchResult = {
  memory: Memory;
  score: number;
  entry: SemanticIndexEntry;
};

export type SemanticNeighbor = {
  memory: Memory;
  score: number;
  entry: SemanticIndexEntry;
};

export async function discoverSemanticNeighbors(
  query: string,
  memories: Memory[],
  index: SemanticIndex,
  options?: {
    limit?: number;
    minimumScore?: number;
  },
): Promise<SemanticNeighbor[]> {
  const normalizedQuery =
    query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const limit =
    Math.max(
      1,
      Math.floor(
        options?.limit ?? 12,
      ),
    );

  const minimumScore =
    options?.minimumScore ?? -1;

  const queryEmbedding =
    await generateEmbedding(
      normalizedQuery,
    );

  const memoriesById =
    new Map<string, Memory>();

  for (
    const memory of memories
  ) {
    memoriesById.set(
      memory.id,
      memory,
    );
  }

  const neighbors:
    SemanticNeighbor[] = [];

  for (
    const [
      memoryId,
      memory,
    ] of memoriesById
  ) {
    const entry =
      index.get(memoryId);

    if (!entry) {
      continue;
    }

    const score =
      cosineSimilarity(
        queryEmbedding,
        entry.embedding,
      );

    if (
      score <
      minimumScore
    ) {
      continue;
    }

    neighbors.push({
      memory,
      score,
      entry,
    });
  }

  neighbors.sort(
    (
      first,
      second,
    ) => {
      if (
        first.score !==
        second.score
      ) {
        return (
          second.score -
          first.score
        );
      }

      return first.memory.id.localeCompare(
        second.memory.id,
      );
    },
  );

  return neighbors.slice(
    0,
    limit,
  );
}

export type SemanticSearchOptions = {
  threshold?: number;
  limit?: number;
};

const DEFAULT_SIMILARITY_THRESHOLD =
  0.35;

const DEFAULT_RESULT_LIMIT =
  20;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function normalizeOptions(
  options?: SemanticSearchOptions,
): Required<SemanticSearchOptions> {
  const threshold =
    options?.threshold ??
    DEFAULT_SIMILARITY_THRESHOLD;

  const limit =
    options?.limit ??
    DEFAULT_RESULT_LIMIT;

  return {
    threshold: clamp(
      threshold,
      -1,
      1,
    ),

    limit: Math.max(
      1,
      Math.floor(limit),
    ),
  };
}

export async function searchSemantic(
  query: string,
  memories: Memory[],
  index: SemanticIndex,
  options?: SemanticSearchOptions,
): Promise<
  SemanticSearchResult[]
> {
  const normalizedQuery =
    query.trim();

  if (
    !normalizedQuery
  ) {
    return [];
  }

  const {
    threshold,
    limit,
  } =
    normalizeOptions(
      options,
    );

    const expandedQueries =
    expandSemanticQuery(
      normalizedQuery,
    );
  
  const queryEmbeddings =
    await Promise.all(
      expandedQueries.map(
        (expandedQuery) =>
          generateEmbedding(
            expandedQuery,
          ),
      ),
    );

  const memoriesById =
    new Map<
      string,
      Memory
    >();

  for (
    const memory of memories
  ) {
    memoriesById.set(
      memory.id,
      memory,
    );
  }

  const results:
    SemanticSearchResult[] =
    [];

  /*
   * The semantic index is the
   * source of embedding vectors.
   *
   * The vault remains the source
   * of actual Memory objects.
   */
  for (
    const memoryId of
    memoriesById.keys()
  ) {
    const entry =
      index.get(
        memoryId,
      );

    if (!entry) {
      continue;
    }

    const memory =
      memoriesById.get(
        memoryId,
      );

    if (!memory) {
      continue;
    }

    let bestScore =
  Number.NEGATIVE_INFINITY;

for (
  const queryEmbedding of
    queryEmbeddings
) {
  const score =
    cosineSimilarity(
      queryEmbedding,
      entry.embedding,
    );

  if (
    score >
    bestScore
  ) {
    bestScore =
      score;
  }
}

if (
  bestScore <
  threshold
) {
  continue;
}

results.push({
  memory,
  score: bestScore,
  entry,
});
  }

  results.sort(
    (
      first,
      second,
    ) => {
      if (
        first.score !==
        second.score
      ) {
        return (
          second.score -
          first.score
        );
      }

      return first.memory.id.localeCompare(
        second.memory.id,
      );
    },
  );

  return results.slice(
    0,
    limit,
  );
}

export function getDefaultSemanticSearchThreshold(): number {
  return DEFAULT_SIMILARITY_THRESHOLD;
}

export function getDefaultSemanticSearchLimit(): number {
  return DEFAULT_RESULT_LIMIT;
}