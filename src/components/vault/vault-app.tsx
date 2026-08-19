"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import {
  ChevronDown,
  Clock3,
  LockKeyhole,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import {
  decryptVaultWithKey,
  type EncryptedVault,
} from "@/lib/crypto/vault";

import {
  clearVaultSession,
  createVaultSession,
  encryptVaultSession,
  getVaultSession,
  unlockVaultSession,
} from "@/lib/vault/session";

import {
  loadRemoteVault,
  createRemoteVault,
  updateRemoteVault,
} from "@/lib/vault/remote";

import {
  VaultSaveQueue,
  type SaveResult,
} from "@/lib/vault/save-queue";

import {
  createMemoryInVault,
  deleteMemoryFromVault,
  getMemoryTagsFromVault,
  getMemoryTypesFromVault,
  searchMemoryResultsInVault,
  updateMemoryInVault,
  type MemorySearchResult,
} from "@/lib/memory/memory-service";

import { SemanticIndex } from "@/lib/memory/search/semantic-index";

import { searchHybrid } from "@/lib/memory/search/hybrid-search";

import type { RankedSearchResult } from "@/lib/memory/search/ranking";

import { deleteAttachment } from "@/lib/memory/attachment-upload";

import { MemoryComposer } from "@/components/memory/memory-composer";

import { MemoryCard } from "@/components/memory/memory-card";

import { normalizeVault } from "@/lib/vault/vault";

import type {
  Memory,
  MemoryAttachment,
  MemoryType,
  Vault,
} from "@/types/memory";

type VaultStatus =
  | "loading"
  | "create"
  | "unlock"
  | "unlocked";

type SaveStatus =
  | "saved"
  | "saving"
  | "error";

type MemorySort =
  | "relevance"
  | "updated-desc"
  | "created-desc"
  | "created-asc"
  | "alphabetical";

type VaultAppProps = {
  userId: string;
};

type MemoryInput = {
  type: MemoryType;
  data: string;
  description: string;
  tags: string[];
  metadata?: Record<string, string>;
  attachments?: MemoryAttachment[];
};

const MAX_RECENT_SEARCHES = 5;

const SEARCH_DEBOUNCE_MS = 180;

function mapRankedSearchResult(
  result: RankedSearchResult,
): MemorySearchResult {
  const matches =
    new Set<
      MemorySearchResult["matches"][number]
    >();

  for (const match of result.matches) {
    if (match.source === "semantic") {
      continue;
    }

    switch (match.field) {
      case "description":
        matches.add("description");
        break;

      case "content":
        matches.add("content");
        break;

      case "tag":
        matches.add("tag");
        break;

      case "metadata-key":
      case "metadata-value":
        matches.add("metadata");
        break;

      case "attachment-name":
      case "attachment-type":
        matches.add("attachment");
        break;

      case "type":
        matches.add("type");
        break;

      case "semantic":
        break;

      default:
        break;
    }

    if (match.source === "exact") {
      matches.add("exact");
    }
  }

  /*
   * Semantic-only retrieval has no
   * concrete lexical field to display.
   */
  if (
    matches.size === 0 &&
    result.sources.includes("semantic")
  ) {
    matches.add("semantic");
  }

  return {
    memory: result.memory,
    score: result.score,
    matches: [...matches],
  };
}

export function VaultApp({
  userId,
}: VaultAppProps) {
  const [status, setStatus] =
    useState<VaultStatus>("loading");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [vault, setVault] =
    useState<Vault | null>(null);

  const [
    encryptedVault,
    setEncryptedVault,
  ] = useState<EncryptedVault | null>(
    null,
  );

  const [
    vaultFileId,
    setVaultFileId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("saved");

  const [search, setSearch] =
    useState("");

  const [
    recentSearches,
    setRecentSearches,
  ] = useState<string[]>([]);

  const [
    selectedType,
    setSelectedType,
  ] = useState<MemoryType | "All">(
    "All",
  );

  const [selectedTag, setSelectedTag] =
    useState("");

  const [
    selectedSort,
    setSelectedSort,
  ] = useState<MemorySort>(
    "relevance",
  );

  const [
    composerOpen,
    setComposerOpen,
  ] = useState(false);

  const [
    composerMode,
    setComposerMode,
  ] = useState<"create" | "edit">(
    "create",
  );

  const [
    editingMemory,
    setEditingMemory,
  ] = useState<Memory | null>(null);

  const [
    searchResults,
    setSearchResults,
  ] = useState<MemorySearchResult[]>(
    [],
  );

  const [
    isSearchLoading,
    setIsSearchLoading,
  ] = useState(false);

  const [
    isSemanticIndexing,
    setIsSemanticIndexing,
  ] = useState(false);

  const [
    semanticIndexReady,
    setSemanticIndexReady,
  ] = useState(false);

  const [
    semanticIndexVersion,
    setSemanticIndexVersion,
  ] = useState(0);

  const saveQueue =
    useRef<VaultSaveQueue | null>(null);

  const semanticIndex =
    useRef<SemanticIndex | null>(null);

  /*
   * This ref is updated from an effect,
   * never during render.
   *
   * The semantic-index effect can then
   * depend only on `status`, avoiding
   * a full semantic-index rebuild after
   * every memory mutation.
   */
  const vaultRef =
    useRef<Vault | null>(null);

  const searchRequestId =
    useRef(0);

  /*
   * Lazily create the session-local
   * semantic index.
   */
  if (semanticIndex.current === null) {
    semanticIndex.current =
      new SemanticIndex();
  }

  /*
   * Keep the latest vault available
   * to non-render lifecycle effects.
   *
   * This is deliberately done inside
   * an effect because React's refs rule
   * forbids mutating refs during render.
   */
  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  /*
   * Configure the remote save queue.
   */
  useEffect(() => {
    if (!vaultFileId) {
      saveQueue.current = null;
      return;
    }

    saveQueue.current =
      new VaultSaveQueue(
        async (
          encrypted,
        ): Promise<SaveResult> => {
          const result =
            await updateRemoteVault(
              vaultFileId,
              encrypted,
            );

          return {
            fileId: result.fileId,
            vault: encrypted,
          };
        },
      );

    return () => {
      saveQueue.current?.clear();
      saveQueue.current = null;
    };
  }, [vaultFileId]);

  /*
   * Load the encrypted vault and restore
   * an existing vault session when one
   * is available.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadVault() {
      try {
        setError("");

        const result =
          await loadRemoteVault();

        if (cancelled) {
          return;
        }

        if (!result.exists) {
          clearVaultSession();

          setVault(null);
          setEncryptedVault(null);
          setVaultFileId(null);
          setSaveStatus("saved");
          setRecentSearches([]);
          setSemanticIndexReady(false);
          setIsSemanticIndexing(false);
          setStatus("create");

          return;
        }

        setVaultFileId(result.fileId);
        setEncryptedVault(result.vault);

        const session =
          getVaultSession();

        if (session) {
          try {
            const decrypted =
              await decryptVaultWithKey<unknown>(
                session.key,
                result.vault,
              );

            const normalized =
              normalizeVault(decrypted);

            if (cancelled) {
              return;
            }

            setVault(normalized);
            setPassword("");
            setConfirmPassword("");
            setSaveStatus("saved");
            setRecentSearches([]);
            setSemanticIndexReady(false);
            setIsSemanticIndexing(false);
            setStatus("unlocked");

            return;
          } catch {
            clearVaultSession();
          }
        }

        setVault(null);
        setRecentSearches([]);
        setSemanticIndexReady(false);
        setIsSemanticIndexing(false);
        setStatus("unlock");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your vault.",
        );

        setStatus("unlock");
      }
    }

    void loadVault();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /*
   * Build the semantic index when the
   * vault becomes unlocked.
   *
   * IMPORTANT:
   *
   * 1. This effect does NOT depend on
   *    `vault`, so editing a memory does
   *    not rebuild the entire index.
   *
   * 2. `vaultRef` is updated separately.
   *
   * 3. State changes occur only from the
   *    asynchronous indexing operation,
   *    not synchronously at the beginning
   *    of the effect.
   */
  useEffect(() => {
    let cancelled = false;

    if (status !== "unlocked") {
      semanticIndex.current?.clear();

      return () => {
        cancelled = true;
      };
    }

    const currentIndex =
      semanticIndex.current;

    const currentVault =
      vaultRef.current;

    if (
      currentIndex === null ||
      currentVault === null
    ) {
      return () => {
        cancelled = true;
      };
    }

    /*
     * Explicitly narrowed immutable
     * aliases. These retain their
     * non-null types inside async code.
     */
    const indexToBuild: SemanticIndex =
      currentIndex;

    const vaultToIndex: Vault =
      currentVault;

    const buildTimer =
      window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setIsSemanticIndexing(true);
        setSemanticIndexReady(false);

        async function buildIndex() {
          try {
            await indexToBuild.rebuild(
              vaultToIndex.memories,
            );

            if (cancelled) {
              return;
            }

            setSemanticIndexReady(true);

            setSemanticIndexVersion(
              (current) => current + 1,
            );
          } catch (error) {
            if (!cancelled) {
              console.error(
                "DUMP semantic index build failed:",
                error,
              );

              setSemanticIndexReady(false);
            }
          } finally {
            if (!cancelled) {
              setIsSemanticIndexing(false);
            }
          }
        }

        void buildIndex();
      }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(buildTimer);
    };
  }, [status]);

  async function handleCreateVault() {
    setError("");

    if (!password) {
      setError(
        "Please enter a vault password.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Vault password must be at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const newVault =
        normalizeVault({
          version: 1,
          memories: [],
        });

      await createVaultSession(
        password,
      );

      const encrypted =
        await encryptVaultSession(
          newVault,
        );

      const result =
        await createRemoteVault(
          encrypted,
        );

      setVault(newVault);
      setEncryptedVault(encrypted);
      setVaultFileId(result.fileId);
      setPassword("");
      setConfirmPassword("");
      setRecentSearches([]);
      setSaveStatus("saved");
      setSemanticIndexReady(false);
      setIsSemanticIndexing(false);
      setStatus("unlocked");
    } catch (error) {
      clearVaultSession();

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your vault.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUnlockVault() {
    setError("");

    if (!password) {
      setError(
        "Please enter your vault password.",
      );
      return;
    }

    if (!encryptedVault) {
      setError(
        "No encrypted vault was found.",
      );
      return;
    }

    if (!vaultFileId) {
      setError(
        "Vault file information is missing.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const decrypted =
        await unlockVaultSession(
          password,
          encryptedVault,
        );

      const normalized =
        normalizeVault(decrypted);

      setVault(normalized);
      setPassword("");
      setConfirmPassword("");
      setRecentSearches([]);
      setSaveStatus("saved");
      setSemanticIndexReady(false);
      setIsSemanticIndexing(false);
      setStatus("unlocked");
    } catch (error) {
      clearVaultSession();

      setError(
        error instanceof Error
          ? error.message
          : "Unable to unlock your vault.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveVault(
    updatedVault: Vault,
  ) {
    if (!getVaultSession()) {
      throw new Error(
        "Vault session has expired. Please unlock your vault again.",
      );
    }

    if (!vaultFileId) {
      throw new Error(
        "Vault file ID is unavailable.",
      );
    }

    const normalized =
      normalizeVault(updatedVault);

    const encrypted =
      await encryptVaultSession(
        normalized,
      );

    if (!saveQueue.current) {
      throw new Error(
        "Vault save system is not ready.",
      );
    }

    setSaveStatus("saving");

    try {
      const result =
        await saveQueue.current.save(
          encrypted,
        );

      setEncryptedVault(result.vault);

      if (result.fileId) {
        setVaultFileId(result.fileId);
      }

      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  }

  async function handleCreateMemory(
    input: MemoryInput,
  ) {
    if (!vault) {
      throw new Error(
        "Vault is locked.",
      );
    }

    const previousVault = vault;

    const result =
      createMemoryInVault(
        previousVault,
        input,
      );

    setVault(result.vault);

    try {
      await saveVault(result.vault);

      if (semanticIndex.current) {
        await semanticIndex.current.indexMemory(
          result.memory,
        );

        setSemanticIndexReady(true);

        setSemanticIndexVersion(
          (current) => current + 1,
        );
      }
    } catch (error) {
      setVault(previousVault);
      throw error;
    }
  }

  async function handleUpdateMemory(
    memoryId: string,
    input: MemoryInput,
  ) {
    if (!vault) {
      throw new Error(
        "Vault is locked.",
      );
    }

    const previousVault = vault;

    const result =
      updateMemoryInVault(
        previousVault,
        memoryId,
        input,
      );

    setVault(result.vault);

    try {
      await saveVault(result.vault);

      const previousMemory =
        previousVault.memories.find(
          (memory) =>
            memory.id === memoryId,
        );

      const updatedMemory =
        result.vault.memories.find(
          (memory) =>
            memory.id === memoryId,
        );

      const previousAttachments =
        previousMemory?.attachments ?? [];

      const updatedAttachmentIds =
        new Set(
          (
            updatedMemory?.attachments ??
            []
          ).map(
            (attachment) =>
              attachment.id,
          ),
        );

      const removedAttachments =
        previousAttachments.filter(
          (attachment) =>
            !updatedAttachmentIds.has(
              attachment.id,
            ),
        );

      for (
        const attachment of
        removedAttachments
      ) {
        try {
          await deleteAttachment(
            attachment.driveFileId,
          );
        } catch (error) {
          console.error(
            "Failed to delete removed attachment from Google Drive:",
            attachment.driveFileId,
            error,
          );
        }
      }

      /*
       * Incrementally update only the
       * changed memory's embedding.
       */
      if (
        updatedMemory &&
        semanticIndex.current
      ) {
        await semanticIndex.current.indexMemory(
          updatedMemory,
        );

        setSemanticIndexReady(true);

        setSemanticIndexVersion(
          (current) => current + 1,
        );
      }
    } catch (error) {
      setVault(previousVault);
      throw error;
    }
  }

  async function handleDeleteMemory(
    memory: Memory,
  ) {
    if (!vault) {
      throw new Error(
        "Vault is locked.",
      );
    }

    const previousVault = vault;

    const result =
      deleteMemoryFromVault(
        previousVault,
        memory.id,
      );

    setVault(result.vault);

    try {
      await saveVault(result.vault);

      /*
       * Remove only this memory's
       * semantic vector.
       */
      semanticIndex.current?.remove(
        memory.id,
      );

      setSemanticIndexVersion(
        (current) => current + 1,
      );

      const attachments =
        memory.attachments ?? [];

      for (
        const attachment of
        attachments
      ) {
        try {
          await deleteAttachment(
            attachment.driveFileId,
          );
        } catch (error) {
          console.error(
            "Failed to delete attachment from Google Drive:",
            attachment.driveFileId,
            error,
          );
        }
      }
    } catch (error) {
      setVault(previousVault);
      throw error;
    }
  }

  function handleOpenCreateComposer() {
    setComposerMode("create");
    setEditingMemory(null);
    setComposerOpen(true);
  }

  function handleOpenEditComposer(
    memory: Memory,
  ) {
    setComposerMode("edit");
    setEditingMemory(memory);
    setComposerOpen(true);
  }

  function handleCloseComposer() {
    setComposerOpen(false);
    setEditingMemory(null);
    setComposerMode("create");
  }

  function handleLockVault() {
    saveQueue.current?.clear();

    clearVaultSession();

    semanticIndex.current?.clear();

    setSemanticIndexReady(false);
    setIsSemanticIndexing(false);

    setSemanticIndexVersion(
      (current) => current + 1,
    );

    setVault(null);
    setSearch("");
    setRecentSearches([]);
    setSelectedType("All");
    setSelectedTag("");
    setSelectedSort("relevance");
    setSearchResults([]);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setComposerOpen(false);
    setEditingMemory(null);
    setSaveStatus("saved");

    setStatus("unlock");
  }

  function addRecentSearch(
    value: string,
  ) {
    const normalized =
      value.trim();

    if (!normalized) {
      return;
    }

    setRecentSearches(
      (current) => {
        const withoutDuplicate =
          current.filter(
            (query) =>
              query.toLowerCase() !==
              normalized.toLowerCase(),
          );

        return [
          normalized,
          ...withoutDuplicate,
        ].slice(
          0,
          MAX_RECENT_SEARCHES,
        );
      },
    );
  }

  function handleSearchKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    addRecentSearch(search);
  }

  function handleRecentSearchClick(
    query: string,
  ) {
    setSearch(query);
    setSelectedSort("relevance");
  }

  function handleClearRecentSearches() {
    setRecentSearches([]);
  }

  const memoryTypes = vault
    ? getMemoryTypesFromVault(vault)
    : [];

  const memoryTags = vault
    ? getMemoryTagsFromVault(vault)
    : [];

  const hasActiveFilters =
    selectedType !== "All" ||
    selectedTag !== "";

  const hasActiveSearch =
    search.trim().length > 0;

  const hasActiveSearchOrFilters =
    hasActiveSearch ||
    hasActiveFilters;

  /*
   * Main search integration.
   *
   * Exact search
   *      ↓
   * Fuzzy search
   *      ↓
   * Semantic search
   *      ↓
   * Hybrid merge
   *      ↓
   * Heuristic ranking
   *
   * Existing search modules are
   * deliberately not modified here.
   */
  useEffect(() => {
    let cancelled = false;

    const currentVault = vault;

    /*
     * CRITICAL:
     *
     * Explicitly narrow the nullable
     * state value BEFORE entering the
     * timeout/async callback.
     *
     * TypeScript can now guarantee that
     * `vaultForSearch` is a Vault.
     */
    if (currentVault === null) {
      const resetTimer =
        window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setSearchResults([]);
          setIsSearchLoading(false);
        }, 0);

      return () => {
        cancelled = true;
        window.clearTimeout(resetTimer);
      };
    }

    const vaultForSearch: Vault =
      currentVault;

    const normalizedQuery =
      search.trim();

    const requestId =
      ++searchRequestId.current;

    const timeout =
      window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        /*
         * Browsing mode:
         * no search query means normal
         * filtered vault display.
         */
        if (!normalizedQuery) {
          const filteredResults =
            searchMemoryResultsInVault(
              vaultForSearch,
              {
                query: "",
                type: selectedType,
                tag: selectedTag,
              },
            );

          if (
            cancelled ||
            requestId !==
              searchRequestId.current
          ) {
            return;
          }

          setSearchResults(
            filteredResults,
          );

          setIsSearchLoading(false);

          return;
        }

        setIsSearchLoading(true);

        async function runSearch() {
          try {
            const filteredMemories =
              searchMemoryResultsInVault(
                vaultForSearch,
                {
                  query: "",
                  type: selectedType,
                  tag: selectedTag,
                },
              ).map(
                (result) =>
                  result.memory,
              );

            const index =
              semanticIndex.current;

              console.log("[DUMP SEARCH DEBUG]", {
                query: normalizedQuery,
                semanticIndexReady,
                indexExists: index !== null,
                indexSize: index?.size ?? 0,
                vaultMemoryCount:
                  vaultForSearch.memories.length,
                filteredMemoryCount:
                  filteredMemories.length,
              });

            /*
             * Semantic index is not ready:
             * fall back to the already-tested
             * lexical exact/fuzzy search path.
             */
            if (
              !semanticIndexReady ||
              index === null
            ) {
              const lexicalResults =
                searchMemoryResultsInVault(
                  vaultForSearch,
                  {
                    query:
                      normalizedQuery,
                    type:
                      selectedType,
                    tag:
                      selectedTag,
                  },
                );

              if (
                cancelled ||
                requestId !==
                  searchRequestId.current
              ) {
                return;
              }

              setSearchResults(
                lexicalResults,
              );

              return;
            }

            /*
             * Full hybrid retrieval:
             *
             * exact
             * fuzzy
             * semantic
             * heuristic ranking
             */
            const response =
              await searchHybrid(
                normalizedQuery,
                filteredMemories,
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

              console.log(
                "[DUMP HYBRID RESULT]",
                normalizedQuery,
                JSON.stringify(
                  response.results.map((result) => {
                    const matches =
                      result.matches.length > 0
                        ? result.matches
                        : result.sources.includes("semantic")
                          ? ["semantic"]
                          : [];
                
                    return {
                      id: result.memory.id,
                      description: result.memory.description,
                      data: result.memory.data,
                      score: result.score,
                      matches,
                    };
                  }),
                  null,
                  2,
                ),
              );

            if (
              cancelled ||
              requestId !==
                searchRequestId.current
            ) {
              return;
            }

            const mappedResults =
  response.results.map(
    mapRankedSearchResult,
  );

console.log(
  "[DUMP MAPPED RESULTS]",
  normalizedQuery,
  JSON.stringify(
    mappedResults,
    null,
    2,
  ),
);

setSearchResults(
  mappedResults,
);
          } catch (error) {
            if (
              cancelled ||
              requestId !==
                searchRequestId.current
            ) {
              return;
            }

            console.error(
              "DUMP hybrid search failed:",
              error,
            );

            /*
             * Never allow semantic search
             * failure to break normal search.
             */
            const lexicalResults =
              searchMemoryResultsInVault(
                vaultForSearch,
                {
                  query:
                    normalizedQuery,
                  type:
                    selectedType,
                  tag:
                    selectedTag,
                },
              );

            setSearchResults(
              lexicalResults,
            );
          } finally {
            if (
              !cancelled &&
              requestId ===
                searchRequestId.current
            ) {
              setIsSearchLoading(false);
            }
          }
        }

        void runSearch();
      }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    vault,
    search,
    selectedType,
    selectedTag,
    semanticIndexReady,
    semanticIndexVersion,
  ]);

  const displayedResults =
    hasActiveSearch ||
    selectedSort === "relevance"
      ? searchResults
      : [...searchResults].sort(
          (a, b) => {
            const memoryA =
              a.memory;

            const memoryB =
              b.memory;

            switch (selectedSort) {
              case "updated-desc": {
                const aTime =
                  Date.parse(
                    memoryA.updatedAt,
                  );

                const bTime =
                  Date.parse(
                    memoryB.updatedAt,
                  );

                return bTime - aTime;
              }

              case "created-desc": {
                const aTime =
                  Date.parse(
                    memoryA.createdAt,
                  );

                const bTime =
                  Date.parse(
                    memoryB.createdAt,
                  );

                return bTime - aTime;
              }

              case "created-asc": {
                const aTime =
                  Date.parse(
                    memoryA.createdAt,
                  );

                const bTime =
                  Date.parse(
                    memoryB.createdAt,
                  );

                return aTime - bTime;
              }

              case "alphabetical":
                return memoryA.description.localeCompare(
                  memoryB.description,
                  undefined,
                  {
                    sensitivity:
                      "base",
                  },
                );

              default:
                return 0;
            }
          },
        );

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex min-h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading your vault...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    status === "create" ||
    status === "unlock"
  ) {
    const isCreate =
      status === "create";

    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-muted">
              <LockKeyhole className="size-5" />
            </div>

            <CardTitle className="text-2xl">
              {isCreate
                ? "Create your Vault Password"
                : "Unlock your Vault"}
            </CardTitle>

            <CardDescription>
              {isCreate
                ? "Your vault password protects your private memories."
                : "Enter your vault password to access your private memories."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              <Input
                type="password"
                placeholder="Vault password"
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value,
                  );
                  setError("");
                }}
              />

              {isCreate && (
                <Input
                  type="password"
                  placeholder="Confirm vault password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value,
                    );
                    setError("");
                  }}
                />
              )}

              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={isLoading}
                onClick={
                  isCreate
                    ? handleCreateVault
                    : handleUnlockVault
                }
              >
                {isLoading
                  ? "Please wait..."
                  : isCreate
                    ? "Create Vault"
                    : "Unlock Vault"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memoryCount =
    vault?.memories.length ?? 0;

  const saveLabel =
    saveStatus === "saving"
      ? "Saving"
      : saveStatus === "error"
        ? "Save failed"
        : "Saved";

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-foreground/50" />
                  Private vault
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Your memories
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  A private place for everything worth remembering.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={saveStatus === "error" ? "text-destructive" : ""}>
                    {saveLabel}
                  </span>
                  {isSemanticIndexing && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Preparing search</span>
                    </>
                  )}
                  {!isSemanticIndexing && isSearchLoading && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Searching</span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-fit shrink-0"
                onClick={handleLockVault}
              >
                <LockKeyhole className="mr-2 size-4" />
                Lock Vault
              </Button>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    className="h-11 border-border/80 bg-background pl-10 pr-10 text-sm shadow-sm"
                    placeholder="Search anything..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    aria-label="Search your memories"
                  />

                  {search && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearch("");
                        setSelectedSort("relevance");
                      }}
                      className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  className="h-11 shrink-0 sm:px-5"
                  onClick={handleOpenCreateComposer}
                >
                  <Plus className="mr-2 size-4" />
                  Add Memory
                </Button>
              </div>

              {recentSearches.length > 0 && !hasActiveSearch && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    Recent
                  </div>

                  {recentSearches.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => handleRecentSearchClick(query)}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                      title={`Search for "${query}"`}
                    >
                      {query}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleClearRecentSearches}
                    className="px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 border-b pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(event) =>
                      setSelectedType(event.target.value as MemoryType | "All")
                    }
                    className="h-9 appearance-none rounded-md border bg-background px-3 pr-9 text-sm outline-none transition-colors focus:border-foreground/40"
                    aria-label="Filter by memory type"
                  >
                    <option value="All">All types</option>
                    {memoryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <div className="relative">
                  <select
                    value={selectedTag}
                    onChange={(event) => setSelectedTag(event.target.value)}
                    className="h-9 max-w-52 appearance-none rounded-md border bg-background px-3 pr-9 text-sm outline-none transition-colors focus:border-foreground/40"
                    aria-label="Filter by tag"
                  >
                    <option value="">All tags</option>
                    {memoryTags.map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                <div className="relative">
                  <select
                    value={selectedSort}
                    onChange={(event) =>
                      setSelectedSort(event.target.value as MemorySort)
                    }
                    className="h-9 appearance-none rounded-md border bg-background px-3 pr-9 text-sm outline-none transition-colors focus:border-foreground/40"
                    aria-label="Sort memories"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="updated-desc">Recently updated</option>
                    <option value="created-desc">Recently created</option>
                    <option value="created-asc">Oldest first</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>

                {hasActiveSearchOrFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setSelectedType("All");
                      setSelectedTag("");
                      setSelectedSort("relevance");
                    }}
                  >
                    <X className="mr-2 size-4" />
                    Clear
                  </Button>
                )}

                <span className="ml-auto text-xs text-muted-foreground">
                  {displayedResults.length}{" "}
                  {displayedResults.length === 1 ? "result" : "results"}
                </span>
              </div>

              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </section>

            {displayedResults.length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="flex min-h-56 items-center justify-center px-6">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full border bg-muted/30">
                      {hasActiveSearchOrFilters ? (
                        <Search className="size-4 text-muted-foreground" />
                      ) : (
                        <Plus className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <p className="font-medium">
                      {hasActiveSearchOrFilters
                        ? "Nothing found"
                        : "Your vault is empty"}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {hasActiveSearchOrFilters
                        ? "Try searching with different words or clear your filters."
                        : "Dump something you want to remember."}
                    </p>

                    {hasActiveSearchOrFilters ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setSearch("");
                          setSelectedType("All");
                          setSelectedTag("");
                          setSelectedSort("relevance");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={handleOpenCreateComposer}
                      >
                        <Plus className="mr-2 size-4" />
                        Add your first memory
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {displayedResults.map((result) => (
                  <MemoryCard
                    key={result.memory.id}
                    memory={result.memory}
                    searchMatches={hasActiveSearch ? result.matches : []}
                    onEdit={handleOpenEditComposer}
                    onDelete={handleDeleteMemory}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MemoryComposer
        open={composerOpen}
        mode={composerMode}
        initialMemory={editingMemory}
        onClose={handleCloseComposer}
        onCreate={handleCreateMemory}
        onUpdate={handleUpdateMemory}
      />
    </>
  );
}