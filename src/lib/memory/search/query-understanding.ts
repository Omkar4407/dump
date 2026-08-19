export type QueryIntent =
  | "lookup"
  | "conceptual"
  | "natural-language"
  | "unknown";

export type QueryUnderstanding = {
  originalQuery: string;
  normalizedQuery: string;
  concepts: string[];
  intent: QueryIntent;
  entities: string[];
  confidence: number;
};

function normalizeQuery(
  query: string,
): string {
  return query
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function uniqueNonEmpty(
  values: string[],
): string[] {
  return [
    ...new Set(
      values
        .map(normalizeQuery)
        .filter(Boolean),
    ),
  ];
}

function detectIntent(
  query: string,
): {
  intent: QueryIntent;
  confidence: number;
} {
  const tokenCount =
    query.split(/\s+/).filter(Boolean).length;

  if (tokenCount === 0) {
    return {
      intent: "unknown",
      confidence: 0,
    };
  }

  /*
   * Short noun-like queries are generally
   * conceptual lookup queries.
   *
   * Examples:
   *
   * fashion
   * travel
   * programming
   * measurements
   */
  if (tokenCount <= 2) {
    return {
      intent: "conceptual",
      confidence: 0.65,
    };
  }

  /*
   * Longer queries contain more natural
   * language and therefore benefit more
   * from semantic interpretation.
   */
  if (tokenCount >= 4) {
    return {
      intent: "natural-language",
      confidence: 0.70,
    };
  }

  return {
    intent: "lookup",
    confidence: 0.55,
  };
}

export function understandQuery(
  query: string,
): QueryUnderstanding {
  const normalizedQuery =
    normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      originalQuery: query,
      normalizedQuery: "",
      concepts: [],
      intent: "unknown",
      entities: [],
      confidence: 0,
    };
  }

  const {
    intent,
    confidence,
  } =
    detectIntent(
      normalizedQuery,
    );

  return {
    originalQuery: query,
    normalizedQuery,
    concepts: uniqueNonEmpty([
      normalizedQuery,
    ]),
    intent,
    entities: [],
    confidence,
  };
}

export function getQueryTexts(
  understanding: QueryUnderstanding,
): string[] {
  return uniqueNonEmpty([
    understanding.normalizedQuery,
    ...understanding.concepts,
    ...understanding.entities,
  ]);
}