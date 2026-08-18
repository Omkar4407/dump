"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  LockKeyhole,
  Plus,
  Search,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

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
  searchMemoriesInVault,
  updateMemoryInVault,
} from "@/lib/memory/memory-service";

import {
  deleteAttachment,
} from "@/lib/memory/attachment-upload";

import {
  MemoryComposer,
} from "@/components/memory/memory-composer";

import {
  MemoryCard,
} from "@/components/memory/memory-card";

import {
  normalizeVault,
} from "@/lib/vault/vault";

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

type VaultAppProps = {
  userId: string;
};

type MemoryInput = {
  type: MemoryType;
  data: string;
  description: string;
  tags: string[];
  metadata?: Record<
    string,
    string
  >;
  attachments?: MemoryAttachment[];
};

export function VaultApp({
  userId,
}: VaultAppProps) {
  const [status, setStatus] =
    useState<VaultStatus>(
      "loading",
    );

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
  ] =
    useState<EncryptedVault | null>(
      null,
    );

  const [
    vaultFileId,
    setVaultFileId,
  ] =
    useState<string | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    saveStatus,
    setSaveStatus,
  ] =
    useState<SaveStatus>(
      "saved",
    );

  const [search, setSearch] =
    useState("");

  const [
    composerOpen,
    setComposerOpen,
  ] = useState(false);

  const [
    composerMode,
    setComposerMode,
  ] =
    useState<
      "create" | "edit"
    >("create");

  const [
    editingMemory,
    setEditingMemory,
  ] =
    useState<Memory | null>(
      null,
    );

  const saveQueue =
    useRef<VaultSaveQueue | null>(
      null,
    );

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
            fileId:
              result.fileId,
            vault: encrypted,
          };
        },
      );

    return () => {
      saveQueue.current?.clear();
      saveQueue.current = null;
    };
  }, [vaultFileId]);

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
          setStatus("create");

          return;
        }

        setVaultFileId(
          result.fileId,
        );

        setEncryptedVault(
          result.vault,
        );

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
              normalizeVault(
                decrypted,
              );

            if (cancelled) {
              return;
            }

            setVault(
              normalized,
            );

            setPassword("");
            setConfirmPassword("");
            setSaveStatus("saved");
            setStatus("unlocked");

            return;
          } catch {
            clearVaultSession();
          }
        }

        setVault(null);
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

    loadVault();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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

    if (
      password !==
      confirmPassword
    ) {
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
      setEncryptedVault(
        encrypted,
      );
      setVaultFileId(
        result.fileId,
      );

      setPassword("");
      setConfirmPassword("");
      setSaveStatus("saved");
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
        normalizeVault(
          decrypted,
        );

      setVault(
        normalized,
      );

      setPassword("");
      setConfirmPassword("");
      setSaveStatus("saved");
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
      normalizeVault(
        updatedVault,
      );

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

      setEncryptedVault(
        result.vault,
      );

      if (result.fileId) {
        setVaultFileId(
          result.fileId,
        );
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

    const previousVault =
      vault;

    const result =
      createMemoryInVault(
        previousVault,
        input,
      );

    setVault(
      result.vault,
    );

    try {
      await saveVault(
        result.vault,
      );
    } catch (error) {
      setVault(
        previousVault,
      );

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

    const previousVault =
      vault;

    const result =
      updateMemoryInVault(
        previousVault,
        memoryId,
        input,
      );

    setVault(
      result.vault,
    );

    try {
      await saveVault(
        result.vault,
      );

      /*
       * The new vault is now safely
       * persisted. Any attachment that
       * disappeared from the memory
       * can now be deleted from Drive.
       */
      const previousMemory =
        previousVault.memories.find(
          (memory) =>
            memory.id ===
            memoryId,
        );

      const updatedMemory =
        result.vault.memories.find(
          (memory) =>
            memory.id ===
            memoryId,
        );

      const previousAttachments =
        previousMemory?.attachments ??
        [];

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
    } catch (error) {
      setVault(
        previousVault,
      );

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

    const previousVault =
      vault;

    const result =
      deleteMemoryFromVault(
        previousVault,
        memory.id,
      );

    setVault(
      result.vault,
    );

    try {
      /*
       * Save the encrypted vault first.
       * Only after this succeeds do we
       * remove the corresponding files
       * from Google Drive.
       */
      await saveVault(
        result.vault,
      );

      const attachments =
        memory.attachments ??
        [];

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
      setVault(
        previousVault,
      );

      throw error;
    }
  }

  function handleOpenCreateComposer() {
    setComposerMode(
      "create",
    );

    setEditingMemory(null);
    setComposerOpen(true);
  }

  function handleOpenEditComposer(
    memory: Memory,
  ) {
    setComposerMode("edit");

    setEditingMemory(
      memory,
    );

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

    setVault(null);
    setSearch("");
    setError("");
    setPassword("");
    setConfirmPassword("");
    setComposerOpen(false);
    setEditingMemory(null);
    setSaveStatus("saved");

    setStatus("unlock");
  }

  const filteredMemories =
    vault
      ? searchMemoriesInVault(
          vault,
          search,
        )
      : [];

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
                  value={
                    confirmPassword
                  }
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

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                Your Vault
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {vault?.memories.length ??
                  0}{" "}
                {vault?.memories.length ===
                1
                  ? "memory"
                  : "memories"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {saveStatus ===
                  "saving" &&
                  "Saving..."}
                {saveStatus ===
                  "saved" &&
                  "Saved"}
                {saveStatus ===
                  "error" &&
                  "Save failed"}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={
                handleLockVault
              }
            >
              <LockKeyhole className="mr-2 size-4" />
              Lock Vault
            </Button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Search memories, tags..."
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </div>

            <Button
              onClick={
                handleOpenCreateComposer
              }
            >
              <Plus className="mr-2 size-4" />
              Add Memory
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          {filteredMemories.length ===
          0 ? (
            <Card>
              <CardContent className="flex min-h-48 items-center justify-center">
                <div className="text-center">
                  <p className="font-medium">
                    {search
                      ? "No memories found"
                      : "Your vault is empty"}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {search
                      ? "Try a different search."
                      : "Dump something you want to remember."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredMemories.map(
                (memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onEdit={
                      handleOpenEditComposer
                    }
                    onDelete={
                      handleDeleteMemory
                    }
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <MemoryComposer
        open={composerOpen}
        mode={composerMode}
        initialMemory={
          editingMemory
        }
        onClose={
          handleCloseComposer
        }
        onCreate={
          handleCreateMemory
        }
        onUpdate={
          handleUpdateMemory
        }
      />
    </>
  );
}