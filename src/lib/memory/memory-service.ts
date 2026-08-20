import type {
    Memory,
    MemoryAttachment,
    MemoryMetadata,
    MemoryType,
    Vault,
  } from "@/types/memory";
  
  import {
    addMemory,
    createMemory,
    deleteMemory,
    updateMemory,
  } from "@/lib/vault/vault";
  
  import {
    exactSearch,
    type ExactSearchField,
  } from "@/lib/memory/search/exact-search";
  
  import {
    fuzzySearch,
    type FuzzySearchField,
  } from "@/lib/memory/search/fuzzy-search";
  
  export type CreateMemoryInput = {
    type: MemoryType;
    data: string;
    description: string;
    tags?: string[];
    metadata?: MemoryMetadata;
    attachments?: MemoryAttachment[];
  };

  export type UpdateMemoryInput = {
    type?: MemoryType;
    data?: string;
    description?: string;
    tags?: string[];
    metadata?: MemoryMetadata;
    attachments?: MemoryAttachment[];
  };
  
  export type MemorySearchFilters = {
    type?: MemoryType | "All";
    tag?: string;
  };
  
  export type MemorySearchOptions =
    MemorySearchFilters & {
      query?: string;
    };
  
    export type MemorySearchMatch =
    | "exact"
    | "description"
    | "content"
    | "tag"
    | "metadata"
    | "attachment"
    | "type"
    | "semantic";
  
  export type MemorySearchResult = {
    memory: Memory;
    score: number;
    matches: MemorySearchMatch[];
  };
  
  function normalizeTags(
    tags: string[] = [],
  ): string[] {
    return [
      ...new Set(
        tags
          .map((tag) =>
            tag.trim(),
          )
          .filter(Boolean)
          .map((tag) =>
            tag
              .replace(
                /^#/,
                "",
              )
              .trim(),
          )
          .filter(Boolean),
      ),
    ];
  }
  
  function normalizeMetadata(
    metadata: MemoryMetadata = {},
  ): MemoryMetadata {
    const normalized: MemoryMetadata =
      {};
  
    for (
      const [key, value] of
      Object.entries(metadata)
    ) {
      const normalizedKey =
        key.trim();
  
      if (!normalizedKey) {
        continue;
      }
  
      normalized[
        normalizedKey
      ] = value;
    }
  
    return normalized;
  }
  
  function validateDescription(
    description: string,
  ): string {
    const value =
      description.trim();
  
    if (!value) {
      throw new Error(
        "Memory description cannot be empty.",
      );
    }
  
    return value;
  }
  
  function validateData(
    data: string,
  ): string {
    const value =
      data.trim();

    if (!value) {
      throw new Error(
        "Memory content cannot be empty.",
      );
    }

    return value;
  }

  /*
   * Image/File/Audio/Video memories carry
   * their payload as encrypted attachments,
   * so their text body is legitimately empty.
   */
  function isAttachmentMemoryType(
    type: MemoryType,
  ): boolean {
    return (
      type === "Image" ||
      type === "File" ||
      type === "Audio" ||
      type === "Video"
    );
  }

  function normalizeAttachments(
    attachments: MemoryAttachment[] = [],
  ): MemoryAttachment[] {
    const seen = new Set<string>();

    const normalized:
      MemoryAttachment[] = [];

    for (
      const attachment of attachments
    ) {
      if (
        seen.has(attachment.id)
      ) {
        continue;
      }

      seen.add(attachment.id);

      normalized.push(attachment);
    }

    return normalized;
  }

  /*
   * Content is required unless the memory
   * is carried entirely by its attachments.
   */
  function validateMemoryBody(
    type: MemoryType,
    data: string,
    attachments: MemoryAttachment[],
  ): string {
    if (
      isAttachmentMemoryType(type) &&
      attachments.length > 0
    ) {
      return data.trim();
    }

    return validateData(data);
  }
  
  function validateLink(
    value: string,
  ): void {
    let url: URL;
  
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        "Invalid link.",
      );
    }
  
    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      throw new Error(
        "Only HTTP and HTTPS links are supported.",
      );
    }
  }
  
  function validateCredential(
    value: string,
  ): void {
    let credential: unknown;
  
    try {
      credential =
        JSON.parse(value);
    } catch {
      throw new Error(
        "Credential data is invalid.",
      );
    }
  
    if (
      typeof credential !==
        "object" ||
      credential === null
    ) {
      throw new Error(
        "Credential data is invalid.",
      );
    }
  
    const record =
      credential as Record<
        string,
        unknown
      >;
  
    if (
      typeof record.name !==
        "string" ||
      !record.name.trim()
    ) {
      throw new Error(
        "Credential name is required.",
      );
    }
  
    if (
      typeof record.username !==
        "string" ||
      !record.username.trim()
    ) {
      throw new Error(
        "Credential username is required.",
      );
    }
  
    if (
      typeof record.password !==
        "string" ||
      !record.password
    ) {
      throw new Error(
        "Credential password is required.",
      );
    }
  }
  
  function validateCreateInput(
    input: CreateMemoryInput,
  ): {
    type: MemoryType;
    data: string;
    description: string;
    tags: string[];
    metadata: MemoryMetadata;
    attachments: MemoryAttachment[];
  } {
    const description =
      validateDescription(
        input.description,
      );

    const attachments =
      normalizeAttachments(
        input.attachments,
      );

    const data =
      validateMemoryBody(
        input.type,
        input.data,
        attachments,
      );


    if (
      input.type ===
      "Link"
    ) {
      validateLink(data);
    }
  
    if (
      input.type ===
      "Credential"
    ) {
      validateCredential(
        data,
      );
    }
  
    const metadata =
      normalizeMetadata(
        input.metadata,
      );
  
    if (
      input.type ===
        "Code" &&
      !metadata.language
    ) {
      metadata.language =
        "plaintext";
    }
  
    return {
      type: input.type,
      data,
      description,
      tags: normalizeTags(
        input.tags,
      ),
      metadata,
      attachments,
    };
  }

  export function createMemoryInVault(
    vault: Vault,
    input: CreateMemoryInput,
  ): {
    vault: Vault;
    memory: Memory;
  } {
    const validated =
      validateCreateInput(
        input,
      );
  
    const memory =
      createMemory(
        validated.type,
        validated.data,
        validated.description,
        validated.tags,
        validated.metadata,
        validated.attachments,
      );
  
    const updatedVault =
      addMemory(
        vault,
        memory,
      );
  
    return {
      vault: updatedVault,
      memory,
    };
  }
  
  export function getMemoryFromVault(
    vault: Vault,
    memoryId: string,
  ): Memory | null {
    return (
      vault.memories.find(
        (memory) =>
          memory.id ===
          memoryId,
      ) ?? null
    );
  }
  
  export function getAllMemoriesFromVault(
    vault: Vault,
  ): Memory[] {
    return [
      ...vault.memories,
    ];
  }
  
  export function getMemoryTypesFromVault(
    vault: Vault,
  ): MemoryType[] {
    return [
      ...new Set(
        vault.memories.map(
          (memory) =>
            memory.type,
        ),
      ),
    ];
  }
  
  export function getMemoryTagsFromVault(
    vault: Vault,
  ): string[] {
    return [
      ...new Set(
        vault.memories.flatMap(
          (memory) =>
            memory.tags ?? [],
        ),
      ),
    ].sort(
      (a, b) =>
        a.localeCompare(b),
    );
  }
  
  function normalizeSearchText(
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
  
  function filterMemories(
    vault: Vault,
    options: MemorySearchOptions,
  ): Memory[] {
    const normalizedTag =
      normalizeSearchText(
        (
          options.tag ??
          ""
        ).replace(
          /^#/,
          "",
        ),
      );
  
    const selectedType =
      options.type ??
      "All";
  
    return vault.memories.filter(
      (memory) => {
        if (
          selectedType !==
            "All" &&
          memory.type !==
            selectedType
        ) {
          return false;
        }
  
        if (
          normalizedTag
        ) {
          const tags = (
            memory.tags ?? []
          ).map((tag) =>
            normalizeSearchText(
              tag.replace(
                /^#/,
                "",
              ),
            ),
          );
  
          if (
            !tags.includes(
              normalizedTag,
            )
          ) {
            return false;
          }
        }
  
        return true;
      },
    );
  }
  
  function mapExactMatchField(
    field: ExactSearchField,
  ): MemorySearchMatch {
    switch (field) {
      case "description":
        return "description";
  
      case "content":
        return "content";
  
      case "tag":
        return "tag";
  
      case "metadata-key":
      case "metadata-value":
        return "metadata";
  
      case "attachment-name":
      case "attachment-type":
        return "attachment";
  
      case "type":
        return "type";
  
      default:
        return "content";
    }
  }
  
  function mapFuzzyMatchField(
    field: FuzzySearchField,
  ): MemorySearchMatch {
    switch (field) {
      case "description":
        return "description";
  
      case "content":
        return "content";
  
      case "tag":
        return "tag";
  
      case "metadata-key":
      case "metadata-value":
        return "metadata";
  
      case "attachment-name":
      case "attachment-type":
        return "attachment";
  
      case "type":
        return "type";
  
      default:
        return "content";
    }
  }
  
  function addPublicMatch(
    target: Set<MemorySearchMatch>,
    match: MemorySearchMatch,
  ): void {
    target.add(match);
  }
  
  function getPublicSearchMatches(
    exactFields: ExactSearchField[],
    fuzzyFields: FuzzySearchField[],
    hasExactMatch: boolean,
  ): MemorySearchMatch[] {
    const matches =
      new Set<MemorySearchMatch>();
  
    /*
     * "exact" is reserved for an
     * actual exact lexical retrieval.
     *
     * A fuzzy-only result must never
     * be presented to the UI as exact.
     */
    if (hasExactMatch) {
      addPublicMatch(
        matches,
        "exact",
      );
    }
  
    for (const field of exactFields) {
      addPublicMatch(
        matches,
        mapExactMatchField(
          field,
        ),
      );
    }
  
    for (const field of fuzzyFields) {
      addPublicMatch(
        matches,
        mapFuzzyMatchField(
          field,
        ),
      );
    }
  
    return [
      ...matches,
    ];
  }
  
  /*
   * Exact results receive a large
   * ranking band so that exact lexical
   * retrieval always outranks a fuzzy-only
   * result.
   *
   * Fuzzy similarity is retained as a
   * secondary signal for memories that
   * are found by both engines.
   */
  const EXACT_RESULT_BONUS =
    10_000;
  
  const FUZZY_SECONDARY_FACTOR =
    0.01;
  
  type CombinedSearchResult = {
    memory: Memory;
    score: number;
    matches: MemorySearchMatch[];
    exact: boolean;
    originalIndex: number;
  };
  
  export function searchMemoryResultsInVault(
    vault: Vault,
    options: MemorySearchOptions = {},
  ): MemorySearchResult[] {
    const normalizedQuery =
      normalizeSearchText(
        options.query ??
          "",
      );
  
    const filteredMemories =
      filterMemories(
        vault,
        options,
      );
  
    /*
     * No query means there is no
     * retrieval/ranking operation.
     *
     * Return every memory surviving
     * structural filters.
     */
    if (!normalizedQuery) {
      return filteredMemories.map(
        (memory) => ({
          memory,
          score: 0,
          matches: [],
        }),
      );
    }
  
    /*
     * Run both lexical retrieval
     * engines independently.
     */
    const exactResults =
      exactSearch(
        filteredMemories,
        normalizedQuery,
      );
  
    const fuzzyResults =
      fuzzySearch(
        filteredMemories,
        normalizedQuery,
      );
  
    /*
     * Build lookup maps so a memory
     * returned by both engines appears
     * exactly once.
     */
    const exactById =
      new Map(
        exactResults.map(
          (result) => [
            result.memory.id,
            result,
          ],
        ),
      );
  
    const fuzzyById =
      new Map(
        fuzzyResults.map(
          (result) => [
            result.memory.id,
            result,
          ],
        ),
      );
  
    const combined =
      new Map<
        string,
        CombinedSearchResult
      >();
  
    /*
     * Exact results establish the
     * primary ranking band.
     */
    for (
      const [
        index,
        result,
      ] of exactResults.entries()
    ) {
      const fuzzy =
        fuzzyById.get(
          result.memory.id,
        );
  
      const fuzzySecondaryScore =
        fuzzy
          ? fuzzy.score *
            FUZZY_SECONDARY_FACTOR
          : 0;
  
      combined.set(
        result.memory.id,
        {
          memory:
            result.memory,
  
          score:
            EXACT_RESULT_BONUS +
            result.score +
            fuzzySecondaryScore,
  
          matches:
            getPublicSearchMatches(
              result.matches.map(
                (match) =>
                  match.field,
              ),
              fuzzy
                ? fuzzy.matches.map(
                    (match) =>
                      match.field,
                  )
                : [],
              true,
            ),
  
          exact: true,
  
          originalIndex:
            index,
        },
      );
    }
  
    /*
     * Add fuzzy-only results after the
     * exact result band.
     */
    for (
      const [
        index,
        result,
      ] of fuzzyResults.entries()
    ) {
      if (
        exactById.has(
          result.memory.id,
        )
      ) {
        continue;
      }
  
      combined.set(
        result.memory.id,
        {
          memory:
            result.memory,
  
          score:
            result.score,
  
          matches:
            getPublicSearchMatches(
              [],
              result.matches.map(
                (match) =>
                  match.field,
              ),
              false,
            ),
  
          exact: false,
  
          originalIndex:
            index,
        },
      );
    }
  
    const results =
      [
        ...combined.values(),
      ];
  
    /*
     * Ranking rules:
     *
     * 1. Exact results always come
     *    before fuzzy-only results.
     *
     * 2. Within each group, higher
     *    retrieval score wins.
     *
     * 3. Original retrieval order is
     *    the deterministic tie-breaker.
     */
    results.sort(
      (first, second) => {
        if (
          first.exact !==
          second.exact
        ) {
          return first.exact
            ? -1
            : 1;
        }
  
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
          first.originalIndex -
          second.originalIndex
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
  
  export function searchMemoriesInVault(
    vault: Vault,
    queryOrOptions:
      | string
      | MemorySearchOptions,
  ): Memory[] {
    const options: MemorySearchOptions =
      typeof queryOrOptions ===
      "string"
        ? {
            query:
              queryOrOptions,
          }
        : queryOrOptions;
  
    return searchMemoryResultsInVault(
      vault,
      options,
    ).map(
      (result) =>
        result.memory,
    );
  }
  
  export function updateMemoryInVault(
    vault: Vault,
    memoryId: string,
    updates: UpdateMemoryInput,
  ): {
    vault: Vault;
    memory: Memory;
  } {
    const existing =
      getMemoryFromVault(
        vault,
        memoryId,
      );
  
    if (!existing) {
      throw new Error(
        `Memory "${memoryId}" was not found.`,
      );
    }
  
    const nextType =
      updates.type ??
      existing.type;

    const nextAttachments =
      updates.attachments !==
      undefined
        ? normalizeAttachments(
            updates.attachments,
          )
        : (existing.attachments ?? []);

    const nextData =
      updates.data !==
      undefined
        ? validateMemoryBody(
            nextType,
            updates.data,
            nextAttachments,
          )
        : existing.data;


    const nextDescription =
      updates.description !==
      undefined
        ? validateDescription(
            updates.description,
          )
        : existing.description;
  
    const nextTags =
      updates.tags !==
      undefined
        ? normalizeTags(
            updates.tags,
          )
        : existing.tags;
  
    const nextMetadata =
      updates.metadata !==
      undefined
        ? normalizeMetadata(
            updates.metadata,
          )
        : existing.metadata;
  
    if (
      nextType ===
      "Link"
    ) {
      validateLink(
        nextData,
      );
    }
  
    if (
      nextType ===
      "Credential"
    ) {
      validateCredential(
        nextData,
      );
    }
  
    const finalMetadata =
      normalizeMetadata(
        nextMetadata,
      );
  
    if (
      nextType === "Code" &&
      !finalMetadata.language
    ) {
      finalMetadata.language =
        "plaintext";
    }
  
    const updatedVault =
      updateMemory(
        vault,
        memoryId,
        {
          type: nextType,
          data: nextData,
          description:
            nextDescription,
          tags: nextTags,
          metadata:
            finalMetadata,
          attachments:
            nextAttachments,
        },
      );
  
    const memory =
      getMemoryFromVault(
        updatedVault,
        memoryId,
      );
  
    if (!memory) {
      throw new Error(
        `Memory "${memoryId}" was not found after update.`,
      );
    }
  
    return {
      vault: updatedVault,
      memory,
    };
  }
  
  export function deleteMemoryFromVault(
    vault: Vault,
    memoryId: string,
  ): {
    vault: Vault;
    deletedMemory: Memory;
  } {
    const memory =
      getMemoryFromVault(
        vault,
        memoryId,
      );
  
    if (!memory) {
      throw new Error(
        `Memory "${memoryId}" was not found.`,
      );
    }
  
    const updatedVault =
      deleteMemory(
        vault,
        memoryId,
      );
  
    return {
      vault: updatedVault,
      deletedMemory: memory,
    };
  }