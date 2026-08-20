import type {
  Memory,
} from "@/types/memory";

import {
  getSearchableCredentialText,
} from "@/lib/memory/search/credential-fields";

export type FuzzySearchField =
  | "description"
  | "content"
  | "tag"
  | "metadata-key"
  | "metadata-value"
  | "attachment-name"
  | "attachment-type"
  | "type";

export type FuzzySearchMatch = {
  field: FuzzySearchField;
  similarity: number;
  score: number;
};

export type FuzzySearchResult = {
  memory: Memory;
  score: number;
  matches: FuzzySearchMatch[];
};

const MIN_TOKEN_LENGTH = 3;

const DEFAULT_SIMILARITY_THRESHOLD =
  0.72;

const SHORT_TOKEN_THRESHOLD = 0.84;

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function tokenize(
  value: string,
): string[] {
  const normalized =
    normalizeText(
      value,
    );

  if (!normalized) {
    return [];
  }

  return [
    ...new Set(
      normalized
        .split(" ")
        .filter(
          (token) =>
            token.length >=
            MIN_TOKEN_LENGTH,
        ),
    ),
  ];
}

function levenshteinDistance(
  first: string,
  second: string,
): number {
  if (
    first === second
  ) {
    return 0;
  }

  if (!first.length) {
    return second.length;
  }

  if (!second.length) {
    return first.length;
  }

  let previous =
    Array.from(
      {
        length:
          second.length +
          1,
      },
      (_, index) =>
        index,
    );

  for (
    let row = 1;
    row <= first.length;
    row++
  ) {
    const current =
      new Array<number>(
        second.length + 1,
      );

    current[0] =
      row;

    for (
      let column = 1;
      column <=
      second.length;
      column++
    ) {
      const substitutionCost =
        first[
          row - 1
        ] ===
        second[
          column - 1
        ]
          ? 0
          : 1;

      current[column] =
        Math.min(
          current[
            column - 1
          ] + 1,
          previous[
            column
          ] + 1,
          previous[
            column - 1
          ] +
            substitutionCost,
        );
    }

    previous =
      current;
  }

  return previous[
    second.length
  ];
}

function similarity(
  first: string,
  second: string,
): number {
  const normalizedFirst =
    normalizeText(
      first,
    );

  const normalizedSecond =
    normalizeText(
      second,
    );

  if (
    !normalizedFirst ||
    !normalizedSecond
  ) {
    return 0;
  }

  if (
    normalizedFirst ===
    normalizedSecond
  ) {
    return 1;
  }

  /*
   * Prefix matching is useful for
   * natural search terms but is kept
   * below exact-match strength.
   */
  if (
    normalizedFirst.startsWith(
      normalizedSecond,
    ) ||
    normalizedSecond.startsWith(
      normalizedFirst,
    )
  ) {
    const shorterLength =
      Math.min(
        normalizedFirst.length,
        normalizedSecond.length,
      );

    const longerLength =
      Math.max(
        normalizedFirst.length,
        normalizedSecond.length,
      );

    if (
      shorterLength >=
      MIN_TOKEN_LENGTH
    ) {
      return Math.max(
        0.75,
        shorterLength /
          longerLength,
      );
    }
  }

  const distance =
    levenshteinDistance(
      normalizedFirst,
      normalizedSecond,
    );

  const maximumLength =
    Math.max(
      normalizedFirst.length,
      normalizedSecond.length,
    );

  if (
    maximumLength === 0
  ) {
    return 0;
  }

  return (
    1 -
    distance /
      maximumLength
  );
}

function isAcceptableSimilarity(
  queryToken: string,
  candidateToken: string,
  value: number,
  threshold: number,
): boolean {
  if (
    value < threshold
  ) {
    return false;
  }

  /*
   * Very short words create many
   * accidental fuzzy matches.
   *
   * Require substantially stronger
   * similarity for short tokens.
   */
  if (
    queryToken.length <= 4 ||
    candidateToken.length <= 4
  ) {
    return (
      value >=
      SHORT_TOKEN_THRESHOLD
    );
  }

  return true;
}

type SearchableFields = {
  description: string;
  content: string;
  type: string;
  tags: string[];
  metadataEntries: Array<{
    key: string;
    value: string;
  }>;
  attachmentNames: string[];
  attachmentTypes: string[];
};

function getSearchableFields(
  memory: Memory,
): SearchableFields {
  return {
    description:
      normalizeText(
        memory.description,
      ),

    /*
     * IMPORTANT:
     *
     * Credential secrets are deliberately
     * excluded from fuzzy search.
     *
     * Only the service name and username
     * are exposed. Search must never
     * inspect or rank against credential
     * passwords or notes.
     */
    content:
      memory.type ===
      "Credential"
        ? normalizeText(
            getSearchableCredentialText(
              memory,
            ),
          )
        : normalizeText(
            memory.data,
          ),

    type:
      normalizeText(
        memory.type,
      ),

    tags: (
      memory.tags ?? []
    )
      .map((tag) =>
        normalizeText(
          tag,
        ),
      )
      .filter(Boolean),

    metadataEntries:
      Object.entries(
        memory.metadata ?? {},
      ).map(
        ([key, value]) => ({
          key:
            normalizeText(
              key,
            ),

          value:
            normalizeText(
              value,
            ),
        }),
      ),

    attachmentNames: (
      memory.attachments ?? []
    )
      .map(
        (attachment) =>
          normalizeText(
            attachment.fileName,
          ),
      )
      .filter(Boolean),

    attachmentTypes: (
      memory.attachments ?? []
    ).flatMap(
      (attachment) =>
        [
          normalizeText(
            attachment.type,
          ),
          normalizeText(
            attachment.mimeType,
          ),
        ].filter(Boolean),
    ),
  };
}

function findBestTokenSimilarity(
  queryToken: string,
  candidateTokens: string[],
  threshold: number,
): number {
  let best =
    0;

  for (
    const candidateToken of
    candidateTokens
  ) {
    const value =
      similarity(
        queryToken,
        candidateToken,
      );

    if (
      !isAcceptableSimilarity(
        queryToken,
        candidateToken,
        value,
        threshold,
      )
    ) {
      continue;
    }

    if (
      value > best
    ) {
      best = value;
    }
  }

  return best;
}

function scoreField(
  queryTokens: string[],
  field: string,
  weight: number,
  threshold: number,
): {
  score: number;
  similarity: number;
} {
  const candidateTokens =
    tokenize(field);

  if (
    candidateTokens.length ===
    0
  ) {
    return {
      score: 0,
      similarity: 0,
    };
  }

  let totalSimilarity =
    0;

  let matchedTokens =
    0;

  for (
    const queryToken of
    queryTokens
  ) {
    const best =
      findBestTokenSimilarity(
        queryToken,
        candidateTokens,
        threshold,
      );

    if (
      best <= 0
    ) {
      continue;
    }

    totalSimilarity +=
      best;

    matchedTokens +=
      1;
  }

  if (
    matchedTokens === 0
  ) {
    return {
      score: 0,
      similarity: 0,
    };
  }

  const averageSimilarity =
    totalSimilarity /
    queryTokens.length;

  const coverage =
    matchedTokens /
    queryTokens.length;

  /*
   * Both similarity and query-token
   * coverage matter.
   *
   * A memory matching one token out
   * of five should not rank like one
   * matching all five.
   */
  const combined =
    averageSimilarity *
    coverage;

  return {
    score:
      combined *
      weight,

    similarity:
      combined,
  };
}

function scoreArrayField(
  queryTokens: string[],
  values: string[],
  weight: number,
  threshold: number,
): {
  score: number;
  similarity: number;
} {
  let bestSimilarity =
    0;

  for (
    const value of values
  ) {
    const result =
      scoreField(
        queryTokens,
        value,
        weight,
        threshold,
      );

    if (
      result.similarity >
      bestSimilarity
    ) {
      bestSimilarity =
        result.similarity;
    }
  }

  return {
    score:
      bestSimilarity *
      weight,

    similarity:
      bestSimilarity,
  };
}

function getFuzzySearchResult(
  memory: Memory,
  query: string,
  threshold: number,
): FuzzySearchResult | null {
  const normalizedQuery =
    normalizeText(
      query,
    );

  const queryTokens =
    tokenize(
      normalizedQuery,
    );

  if (
    queryTokens.length ===
    0
  ) {
    return null;
  }

  const fields =
    getSearchableFields(
      memory,
    );

  const matches: FuzzySearchMatch[] =
    [];

  const description =
    scoreField(
      queryTokens,
      fields.description,
      100,
      threshold,
    );

  if (
    description.similarity >
    0
  ) {
    matches.push({
      field:
        "description",
      similarity:
        description.similarity,
      score:
        description.score,
    });
  }

  const content =
    scoreField(
      queryTokens,
      fields.content,
      55,
      threshold,
    );

  if (
    content.similarity >
    0
  ) {
    matches.push({
      field:
        "content",
      similarity:
        content.similarity,
      score:
        content.score,
    });
  }

  const type =
    scoreField(
      queryTokens,
      fields.type,
      60,
      threshold,
    );

  if (
    type.similarity >
    0
  ) {
    matches.push({
      field:
        "type",
      similarity:
        type.similarity,
      score:
        type.score,
    });
  }

  const tags =
    scoreArrayField(
      queryTokens,
      fields.tags,
      90,
      threshold,
    );

  if (
    tags.similarity >
    0
  ) {
    matches.push({
      field:
        "tag",
      similarity:
        tags.similarity,
      score:
        tags.score,
    });
  }

  const metadataKeys =
    scoreArrayField(
      queryTokens,
      fields.metadataEntries.map(
        (entry) =>
          entry.key,
      ),
      45,
      threshold,
    );

  if (
    metadataKeys.similarity >
    0
  ) {
    matches.push({
      field:
        "metadata-key",
      similarity:
        metadataKeys.similarity,
      score:
        metadataKeys.score,
    });
  }

  const metadataValues =
    scoreArrayField(
      queryTokens,
      fields.metadataEntries.map(
        (entry) =>
          entry.value,
      ),
      50,
      threshold,
    );

  if (
    metadataValues.similarity >
    0
  ) {
    matches.push({
      field:
        "metadata-value",
      similarity:
        metadataValues.similarity,
      score:
        metadataValues.score,
    });
  }

  const attachmentNames =
    scoreArrayField(
      queryTokens,
      fields.attachmentNames,
      70,
      threshold,
    );

  if (
    attachmentNames.similarity >
    0
  ) {
    matches.push({
      field:
        "attachment-name",
      similarity:
        attachmentNames.similarity,
      score:
        attachmentNames.score,
    });
  }

  const attachmentTypes =
    scoreArrayField(
      queryTokens,
      fields.attachmentTypes,
      30,
      threshold,
    );

  if (
    attachmentTypes.similarity >
    0
  ) {
    matches.push({
      field:
        "attachment-type",
      similarity:
        attachmentTypes.similarity,
      score:
        attachmentTypes.score,
    });
  }

  if (
    matches.length ===
    0
  ) {
    return null;
  }

  /*
   * Prevent a weak isolated fuzzy
   * match from becoming a result.
   */
  const strongestSimilarity =
    Math.max(
      ...matches.map(
        (match) =>
          match.similarity,
      ),
    );

  if (
    strongestSimilarity <
    threshold
  ) {
    return null;
  }

  /*
   * The final fuzzy score is
   * deliberately independent of
   * exact-search scores.
   *
   * Hybrid search will normalize
   * both later.
   */
  const score =
    matches.reduce(
      (
        total,
        match,
      ) =>
        total +
        match.score *
          match.similarity,
      0,
    );

  return {
    memory,
    score,
    matches,
  };
}

export function fuzzySearch(
  memories: Memory[],
  query: string,
  options?: {
    threshold?: number;
  },
): FuzzySearchResult[] {
  const threshold =
    options?.threshold ??
    DEFAULT_SIMILARITY_THRESHOLD;

  const normalizedQuery =
    normalizeText(
      query,
    );

  if (
    !normalizedQuery
  ) {
    return [];
  }

  const results: Array<
    FuzzySearchResult & {
      index: number;
    }
  > = [];

  memories.forEach(
    (
      memory,
      index,
    ) => {
      const result =
        getFuzzySearchResult(
          memory,
          normalizedQuery,
          threshold,
        );

      if (!result) {
        return;
      }

      results.push({
        ...result,
        index,
      });
    },
  );

  results.sort(
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

  return results.map(
    ({
      memory,
      score,
      matches,
    }) => ({
      memory,
      score,
      matches,
    }),
  );
}

export function getFuzzySimilarity(
  first: string,
  second: string,
): number {
  return similarity(
    first,
    second,
  );
}