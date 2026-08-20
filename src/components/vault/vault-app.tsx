"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  Confetti,
  Ring,
  Squiggle,
  Zigzag,
} from "@/components/decor/memphis";

import { MEMORY_TYPE_STYLES } from "@/lib/memory/memory-display";

import { Button } from "@/components/ui/button";

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

import { MemoryDetail } from "@/components/memory/memory-detail";

import { DeleteMemoryDialog } from "@/components/memory/delete-memory-dialog";

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
  metadata?: Record<string, string>;
  attachments?: MemoryAttachment[];
};

const MAX_RECENT_SEARCHES = 5;

const SEARCH_DEBOUNCE_MS = 180;

const SORT_OPTIONS: {
  value: MemorySort;
  label: string;
  searchLabel: string;
}[] = [
  {
    value: "relevance",
    label: "Newest",
    searchLabel: "Relevance",
  },
  {
    value: "updated-desc",
    label: "Recently updated",
    searchLabel: "Recently updated",
  },
  {
    value: "created-desc",
    label: "Recently created",
    searchLabel: "Recently created",
  },
  {
    value: "created-asc",
    label: "Oldest first",
    searchLabel: "Oldest first",
  },
  {
    value: "alphabetical",
    label: "A–Z",
    searchLabel: "A–Z",
  },
];

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

  const [
    passwordVisible,
    setPasswordVisible,
  ] = useState(false);

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

  const [
    selectedSort,
    setSelectedSort,
  ] = useState<MemorySort>(
    "relevance",
  );

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

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
    editingMemoryId,
    setEditingMemoryId,
  ] = useState<string | null>(null);

  const [
    openMemoryId,
    setOpenMemoryId,
  ] = useState<string | null>(null);

  const [
    deleteMemoryId,
    setDeleteMemoryId,
  ] = useState<string | null>(null);

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

  const searchInputRef =
    useRef<HTMLInputElement | null>(null);

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
      setPasswordVisible(false);
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
      setPasswordVisible(false);
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

  function handleVaultFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    if (status === "create") {
      void handleCreateVault();
      return;
    }

    void handleUnlockVault();
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

  async function handleConfirmDelete(
    memory: Memory,
  ) {
    await handleDeleteMemory(memory);

    setDeleteMemoryId(null);

    if (openMemoryId === memory.id) {
      setOpenMemoryId(null);
    }
  }

  function handleOpenCreateComposer() {
    setComposerMode("create");
    setEditingMemoryId(null);
    setComposerOpen(true);
  }

  function handleOpenEditComposer(
    memory: Memory,
  ) {
    setOpenMemoryId(null);
    setComposerMode("edit");
    setEditingMemoryId(memory.id);
    setComposerOpen(true);
  }

  function handleCloseComposer() {
    setComposerOpen(false);
    setEditingMemoryId(null);
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
    setSelectedSort("relevance");
    setSearchResults([]);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setPasswordVisible(false);
    setComposerOpen(false);
    setEditingMemoryId(null);
    setOpenMemoryId(null);
    setDeleteMemoryId(null);
    setFiltersOpen(false);
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
    if (event.key === "Escape") {
      setSearch("");
      return;
    }

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
    searchInputRef.current?.focus();
  }

  function handleClearRecentSearches() {
    setRecentSearches([]);
  }

  function handleClearSearchAndFilters() {
    setSearch("");
    setSelectedType("All");
    setSelectedSort("relevance");
  }

  const memoryTypes = vault
    ? getMemoryTypesFromVault(vault)
    : [];

  const hasActiveFilters =
    selectedType !== "All";

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
                },
              ).map(
                (result) =>
                  result.memory,
              );

            const index =
              semanticIndex.current;

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

            if (
              cancelled ||
              requestId !==
                searchRequestId.current
            ) {
              return;
            }

            setSearchResults(
              response.results.map(
                mapRankedSearchResult,
              ),
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
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <div className="tile flex items-center gap-4 bg-card px-7 py-6 [--edge:var(--border)]">
          <Loader2
            className="size-7 animate-spin text-violet"
            aria-hidden="true"
          />

          <div>
            <p className="display text-xl">
              Opening your vault
            </p>

            <p className="label-mono mt-1.5 text-muted-foreground">
              Decrypting
            </p>
          </div>
        </div>

        <p className="sr-only" role="status">
          Loading your vault
        </p>
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
      <div className="tile-scroll flex-1 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid min-h-full auto-rows-min grid-cols-1 gap-3 sm:gap-4 lg:h-full lg:auto-rows-auto lg:grid-cols-2">
          <section className="tile relative hidden flex-col justify-center overflow-hidden bg-violet p-8 text-white [--edge:var(--violet-deep)] lg:flex">
            <Ring className="pointer-events-none absolute -top-8 -right-8 size-36 text-lemon/60" />

            <Confetti className="pointer-events-none absolute bottom-6 left-6 size-20 text-mint/40" />

            <p className="label-mono text-lemon">
              Private memory vault
            </p>

            <p className="display mt-4 text-4xl">
              {isCreate
                ? "One password protects everything."
                : "Locked and encrypted."}
            </p>

            <p className="mt-4 max-w-sm leading-snug text-white/80">
              {isCreate
                ? "Your vault password never leaves this device, and it cannot be reset. Pick something you will not lose."
                : "Nothing is readable until you unlock. Not by us, not by anyone with access to your Drive."}
            </p>
          </section>

          <section className="tile relative flex flex-col justify-center overflow-hidden bg-card p-5 [--edge:var(--border)] sm:p-8">
            <Squiggle className="pointer-events-none absolute top-4 right-5 h-7 w-20 text-coral/50" />

            <div className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-lemon text-ink">
                <LockKeyhole className="size-5" aria-hidden="true" />
              </span>

              <p className="label-mono text-muted-foreground">
                {isCreate ? "Create vault" : "Vault locked"}
              </p>
            </div>

            <h1 className="display mt-4 text-[clamp(1.75rem,5vw,2.75rem)]">
              {isCreate
                ? "Create your vault password."
                : "Unlock your vault."}
            </h1>

            <form
              onSubmit={handleVaultFormSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="vault-password"
                  className="label-mono"
                >
                  Vault password
                </label>

                <div className="flex gap-2">
                  <Input
                    id="vault-password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    autoComplete={
                      isCreate
                        ? "new-password"
                        : "current-password"
                    }
                    autoFocus
                    disabled={isLoading}
                    onChange={(event) => {
                      setPassword(
                        event.target.value,
                      );
                      setError("");
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "vault-error" : undefined
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    aria-label={
                      passwordVisible
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={passwordVisible}
                    disabled={isLoading}
                    onClick={() =>
                      setPasswordVisible(
                        (value) => !value,
                      )
                    }
                  >
                    {passwordVisible ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              {isCreate && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="vault-confirm-password"
                    className="label-mono"
                  >
                    Confirm password
                    <span className="ml-2 font-normal normal-case opacity-70">
                      min 8 characters
                    </span>
                  </label>

                  <Input
                    id="vault-confirm-password"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    disabled={isLoading}
                    onChange={(event) => {
                      setConfirmPassword(
                        event.target.value,
                      );
                      setError("");
                    }}
                    aria-invalid={Boolean(error)}
                  />
                </div>
              )}

              {error && (
                <p
                  id="vault-error"
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading
                  ? "Working…"
                  : isCreate
                    ? "Create vault"
                    : "Unlock vault"}
                <span aria-hidden="true">→</span>
              </Button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  const memoryCount =
    vault?.memories.length ?? 0;

  const openMemory =
    vault?.memories.find(
      (memory) =>
        memory.id === openMemoryId,
    ) ?? null;

  const editingMemory =
    vault?.memories.find(
      (memory) =>
        memory.id === editingMemoryId,
    ) ?? null;

  const deleteMemory =
    vault?.memories.find(
      (memory) =>
        memory.id === deleteMemoryId,
    ) ?? null;

  const resultCount =
    displayedResults.length;

  const activeFilterCount =
    selectedType !== "All" ? 1 : 0;

  const statusLabel =
    isSemanticIndexing
      ? "Preparing search"
      : isSearchLoading
        ? "Searching"
        : saveStatus === "saving"
          ? "Saving"
          : saveStatus === "error"
            ? "Save failed"
            : "All saved";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
        <section className="tile shrink-0 bg-card p-3 [--edge:var(--border)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-violet"
                aria-hidden="true"
              />

              <Input
                ref={searchInputRef}
                className="h-12 rounded-2xl border-transparent bg-secondary pr-12 pl-12 text-base"
                placeholder="Search anything…"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onKeyDown={handleSearchKeyDown}
                aria-label="Search your memories"
                type="search"
                enterKeyHint="search"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setSelectedSort("relevance");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-coral hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                className="flex-1 lg:flex-none"
                onClick={handleOpenCreateComposer}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add memory
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
                aria-label={
                  filtersOpen
                    ? "Hide filters"
                    : "Show filters"
                }
                onClick={() =>
                  setFiltersOpen(
                    (value) => !value,
                  )
                }
              >
                <SlidersHorizontal
                  className="size-4"
                  aria-hidden="true"
                />
              </Button>

              <Button
                variant="outline"
                onClick={handleLockVault}
              >
                <LockKeyhole className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Lock</span>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
          <aside
            id="filter-panel"
            className={`tile ${
              filtersOpen ? "flex" : "hidden"
            } max-h-[45dvh] min-h-0 flex-col overflow-hidden bg-card [--edge:var(--border)] lg:col-span-4 lg:flex lg:max-h-none xl:col-span-3`}
          >
            <div className="relative shrink-0 overflow-hidden rounded-t-3xl bg-mint/25 px-4 py-3.5">
              <Zigzag className="pointer-events-none absolute -right-3 -bottom-2 h-7 w-20 text-ink/10" />

              <p className="label-mono text-muted-foreground">
                Vault
              </p>

              <p className="display mt-1 text-2xl">
                {memoryCount}{" "}
                <span className="text-base font-semibold opacity-70">
                  {memoryCount === 1
                    ? "memory"
                    : "memories"}
                </span>
              </p>

              <p className="label-mono mt-2 text-muted-foreground">
                {statusLabel}
              </p>
            </div>

            <div className="tile-scroll flex flex-col gap-5 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="label-mono text-muted-foreground">
                    Type
                  </h2>

                  {hasActiveSearchOrFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleClearSearchAndFilters}
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    active={selectedType === "All"}
                    onClick={() =>
                      setSelectedType("All")
                    }
                  >
                    All
                  </FilterChip>

                  {memoryTypes.map((type) => (
                    <FilterChip
                      key={type}
                      active={selectedType === type}
                      activeClassName={
                        MEMORY_TYPE_STYLES[type].chip
                      }
                      onClick={() =>
                        setSelectedType(type)
                      }
                    >
                      {type}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="memory-sort"
                  className="label-mono text-muted-foreground"
                >
                  Sort
                </label>

                <div className="relative">
                  <select
                    id="memory-sort"
                    value={selectedSort}
                    onChange={(event) =>
                      setSelectedSort(
                        event.target
                          .value as MemorySort,
                      )
                    }
                    className="h-11 w-full appearance-none rounded-2xl bg-secondary px-4 pr-10 text-sm font-semibold outline-none"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {hasActiveSearch
                          ? option.searchLabel
                          : option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="label-mono text-muted-foreground">
                      Recent
                    </h2>

                    <button
                      type="button"
                      onClick={handleClearRecentSearches}
                      className="label-mono text-violet underline underline-offset-4 outline-none"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((query) => (
                      <button
                        key={query}
                        type="button"
                        onClick={() =>
                          handleRecentSearchClick(query)
                        }
                        className="max-w-full truncate rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors outline-none hover:bg-violet hover:text-white"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {error}
                </p>
              )}
            </div>
          </aside>

          <section className="tile flex min-h-0 flex-col overflow-hidden bg-card [--edge:var(--border)] lg:col-span-8 xl:col-span-9">
            <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4 pb-3 sm:px-5">
              <h1 className="display text-2xl sm:text-3xl">
                {hasActiveSearch ? (
                  <>
                    Found{" "}
                    <span className="text-violet">
                      {resultCount}
                    </span>{" "}
                    {resultCount === 1
                      ? "memory"
                      : "memories"}
                  </>
                ) : (
                  "Your memories"
                )}
              </h1>

              <p
                className="label-mono text-muted-foreground"
                role="status"
              >
                {hasActiveSearch
                  ? "Search results"
                  : `${resultCount} shown`}
                {activeFilterCount > 0 &&
                  ` · ${activeFilterCount} ${
                    activeFilterCount === 1
                      ? "filter"
                      : "filters"
                  }`}
              </p>
            </div>

            {resultCount === 0 ? (
              <div className="tile-scroll flex flex-1 items-center justify-center px-5 pb-6">
                <div className="relative max-w-sm text-center">
                  <Confetti className="pointer-events-none absolute -top-10 -left-10 size-16 text-lemon" />

                  <Squiggle className="pointer-events-none absolute -right-8 -bottom-8 h-8 w-24 text-mint" />

                  {hasActiveSearchOrFilters ? (
                    <>
                      <p className="display text-3xl">
                        Nothing found.
                      </p>

                      <p className="mt-3 leading-snug text-muted-foreground">
                        Try asking another way, or clear what
                        you have filtered.
                      </p>

                      <Button
                        className="mt-5"
                        onClick={handleClearSearchAndFilters}
                      >
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="display text-3xl">
                        Nothing here yet.
                      </p>

                      <p className="mt-3 leading-snug text-muted-foreground">
                        Your vault is empty. Dump something
                        worth remembering — you never have to
                        organize it.
                      </p>

                      <Button
                        className="mt-5"
                        onClick={handleOpenCreateComposer}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Add memory
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <ul className="tile-scroll grid flex-1 auto-rows-min grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5 2xl:grid-cols-3">
                {displayedResults.map((result, index) => (
                  <li
                    key={result.memory.id}
                    className="flex min-w-0"
                  >
                    <MemoryCard
                      memory={result.memory}
                      index={index}
                      searchMatches={
                        hasActiveSearch
                          ? result.matches
                          : []
                      }
                      onOpen={(memory) =>
                        setOpenMemoryId(memory.id)
                      }
                      onEdit={handleOpenEditComposer}
                      onRequestDelete={(memory) =>
                        setDeleteMemoryId(memory.id)
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <MemoryDetail
        memory={openMemory}
        onClose={() => setOpenMemoryId(null)}
        onEdit={handleOpenEditComposer}
      />

      <DeleteMemoryDialog
        key={deleteMemoryId ?? "no-delete-target"}
        memory={deleteMemory}
        onCancel={() => setDeleteMemoryId(null)}
        onConfirm={handleConfirmDelete}
      />

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

function FilterChip({
  active,
  activeClassName = "bg-violet text-white",
  onClick,
  children,
}: {
  active: boolean;
  activeClassName?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`label-mono max-w-full truncate rounded-full px-2.5 py-1.5 transition-colors outline-none ${
        active
          ? activeClassName
          : "bg-secondary text-foreground hover:bg-violet/15"
      }`}
    >
      {children}
    </button>
  );
}
