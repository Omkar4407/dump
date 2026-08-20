import type {
    Memory,
  } from "@/types/memory";

  import {
    getSearchableCredentialText,
  } from "@/lib/memory/search/credential-fields";
  
  export type ExactSearchField =
    | "description"
    | "content"
    | "tag"
    | "metadata-key"
    | "metadata-value"
    | "attachment-name"
    | "attachment-type"
    | "type";
  
  export type ExactSearchMatch = {
    field: ExactSearchField;
    score: number;
  };
  
  export type ExactSearchResult = {
    memory: Memory;
    score: number;
    matches: ExactSearchMatch[];
  };
  
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
          .filter(Boolean),
      ),
    ];
  }
  
  function getSearchableFields(
    memory: Memory,
  ): {
    description: string;
    content: string;
    type: string;
    tags: string[];
    metadataKeys: string[];
    metadataValues: string[];
    attachmentNames: string[];
    attachmentTypes: string[];
  } {
    return {
      description:
        normalizeText(
          memory.description,
        ),
  
      /*
       * Credential secrets must NEVER
       * participate in search.
       *
       * Only the service name and the
       * username are exposed; the
       * password and notes never are.
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
  
      metadataKeys:
        Object.keys(
          memory.metadata ?? {},
        )
          .map((key) =>
            normalizeText(
              key,
            ),
          )
          .filter(Boolean),
  
      metadataValues:
        Object.values(
          memory.metadata ?? {},
        )
          .map((value) =>
            normalizeText(
              value,
            ),
          )
          .filter(Boolean),
  
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
  
  function includesExactPhrase(
    field: string,
    query: string,
  ): boolean {
    if (
      !field ||
      !query
    ) {
      return false;
    }
  
    return field.includes(
      query,
    );
  }
  
  function isExactField(
    field: string,
    query: string,
  ): boolean {
    return (
      field.length > 0 &&
      field === query
    );
  }
  
  function containsExactToken(
    field: string,
    token: string,
  ): boolean {
    if (
      !field ||
      !token
    ) {
      return false;
    }
  
    return field
      .split(" ")
      .includes(token);
  }
  
  
  function addMatch(
    matches: ExactSearchMatch[],
    field: ExactSearchField,
    score: number,
  ): void {
    matches.push({
      field,
      score,
    });
  }
  
  /*
   * Exact-field ranking hierarchy.
   *
   * A complete field equality is
   * intentionally much stronger than
   * merely containing the query.
   *
   * This is especially important for
   * short/high-frequency queries such
   * as "github", "work", "code", etc.
   */
  const FULL_FIELD_EXACT_SCORE = {
    description: 1000,
    content: 700,
    tag: 650,
    "metadata-key": 450,
    "metadata-value": 500,
    "attachment-name": 600,
    "attachment-type": 250,
    type: 550,
  } as const;
  
  const PHRASE_SCORE = {
    description: 180,
    content: 120,
    tag: 110,
    "metadata-key": 70,
    "metadata-value": 80,
    "attachment-name": 100,
    "attachment-type": 45,
    type: 90,
  } as const;
  
  const TOKEN_SCORE = {
    description: 25,
    content: 12,
    tag: 20,
    "metadata-key": 10,
    "metadata-value": 12,
    "attachment-name": 15,
    "attachment-type": 8,
    type: 15,
  } as const;
  
  function scoreTextField(
    field: string,
    query: string,
    tokens: string[],
    fieldName:
      | "description"
      | "content"
      | "type",
  ): number {
    let score = 0;
  
    if (
      isExactField(
        field,
        query,
      )
    ) {
      score +=
        FULL_FIELD_EXACT_SCORE[
          fieldName
        ];
    } else if (
      includesExactPhrase(
        field,
        query,
      )
    ) {
      score +=
        PHRASE_SCORE[
          fieldName
        ];
    }
  
    for (
      const token of tokens
    ) {
      if (
        containsExactToken(
          field,
          token,
        )
      ) {
        score +=
          TOKEN_SCORE[
            fieldName
          ];
      }
    }
  
    return score;
  }
  
  function scoreArrayField(
    values: string[],
    query: string,
    tokens: string[],
    fieldName:
      | "tag"
      | "metadata-key"
      | "metadata-value"
      | "attachment-name"
      | "attachment-type",
  ): number {
    let score = 0;
  
    for (
      const value of values
    ) {
      if (
        isExactField(
          value,
          query,
        )
      ) {
        score +=
          FULL_FIELD_EXACT_SCORE[
            fieldName
          ];
  
        continue;
      }
  
      if (
        includesExactPhrase(
          value,
          query,
        )
      ) {
        score +=
          PHRASE_SCORE[
            fieldName
          ];
      }
  
      for (
        const token of tokens
      ) {
        if (
          containsExactToken(
            value,
            token,
          )
        ) {
          score +=
            TOKEN_SCORE[
              fieldName
            ];
        }
      }
    }
  
    return score;
  }
  
  function getExactSearchResult(
    memory: Memory,
    query: string,
  ): ExactSearchResult | null {
    const normalizedQuery =
      normalizeText(
        query,
      );
  
    if (
      !normalizedQuery
    ) {
      return null;
    }
  
    const tokens =
      tokenize(
        normalizedQuery,
      );
  
    if (
      tokens.length === 0
    ) {
      return null;
    }
  
    const fields =
      getSearchableFields(
        memory,
      );
  
    const matches: ExactSearchMatch[] =
      [];
  
    const descriptionScore =
      scoreTextField(
        fields.description,
        normalizedQuery,
        tokens,
        "description",
      );
  
    if (
      descriptionScore > 0
    ) {
      addMatch(
        matches,
        "description",
        descriptionScore,
      );
    }
  
    /*
     * Credential secrets are already
     * excluded by getSearchableFields,
     * which exposes only the service
     * name and username.
     */
    const contentScore =
      scoreTextField(
        fields.content,
        normalizedQuery,
        tokens,
        "content",
      );
  
    if (
      contentScore > 0
    ) {
      addMatch(
        matches,
        "content",
        contentScore,
      );
    }
  
    const typeScore =
      scoreTextField(
        fields.type,
        normalizedQuery,
        tokens,
        "type",
      );
  
    if (
      typeScore > 0
    ) {
      addMatch(
        matches,
        "type",
        typeScore,
      );
    }
  
    const tagScore =
      scoreArrayField(
        fields.tags,
        normalizedQuery,
        tokens,
        "tag",
      );
  
    if (
      tagScore > 0
    ) {
      addMatch(
        matches,
        "tag",
        tagScore,
      );
    }
  
    const metadataKeyScore =
      scoreArrayField(
        fields.metadataKeys,
        normalizedQuery,
        tokens,
        "metadata-key",
      );
  
    if (
      metadataKeyScore > 0
    ) {
      addMatch(
        matches,
        "metadata-key",
        metadataKeyScore,
      );
    }
  
    const metadataValueScore =
      scoreArrayField(
        fields.metadataValues,
        normalizedQuery,
        tokens,
        "metadata-value",
      );
  
    if (
      metadataValueScore > 0
    ) {
      addMatch(
        matches,
        "metadata-value",
        metadataValueScore,
      );
    }
  
    const attachmentNameScore =
      scoreArrayField(
        fields.attachmentNames,
        normalizedQuery,
        tokens,
        "attachment-name",
      );
  
    if (
      attachmentNameScore > 0
    ) {
      addMatch(
        matches,
        "attachment-name",
        attachmentNameScore,
      );
    }
  
    const attachmentTypeScore =
      scoreArrayField(
        fields.attachmentTypes,
        normalizedQuery,
        tokens,
        "attachment-type",
      );
  
    if (
      attachmentTypeScore > 0
    ) {
      addMatch(
        matches,
        "attachment-type",
        attachmentTypeScore,
      );
    }
  
    if (
      matches.length === 0
    ) {
      return null;
    }
  
    const score =
      matches.reduce(
        (
          total,
          match,
        ) =>
          total +
          match.score,
        0,
      );
  
    return {
      memory,
      score,
      matches,
    };
  }
  
  export function exactSearch(
    memories: Memory[],
    query: string,
  ): ExactSearchResult[] {
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
      ExactSearchResult & {
        index: number;
      }
    > = [];
  
    memories.forEach(
      (
        memory,
        index,
      ) => {
        const result =
          getExactSearchResult(
            memory,
            normalizedQuery,
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
  
  export function hasExactMatch(
    memory: Memory,
    query: string,
  ): boolean {
    return (
      getExactSearchResult(
        memory,
        query,
      ) !== null
    );
  }
  
  export function normalizeExactSearchQuery(
    query: string,
  ): string {
    return normalizeText(
      query,
    );
  }