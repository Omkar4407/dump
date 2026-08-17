"use client";

import {
  useState,
  useSyncExternalStore,
} from "react";
import {
  LockKeyhole,
  Plus,
  Search,
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
  decryptDUMPVault,
  encryptDUMPVault,
  createEmptyVault,
  createMemory,
  addMemory,
} from "@/lib/vault/vault";

import {
  getEncryptedVault,
  saveEncryptedVault,
} from "@/lib/vault/storage";

import type { Vault } from "@/types/memory";

type VaultStatus =
  | "create"
  | "unlock"
  | "unlocked";

type VaultAppProps = {
  userId: string;
};

function getStorageKey(userId: string) {
  return `dump-encrypted-vault:${userId}`;
}

function subscribeToStorage(
  callback: () => void,
) {
  window.addEventListener(
    "storage",
    callback,
  );

  return () => {
    window.removeEventListener(
      "storage",
      callback,
    );
  };
}

function getVaultExists(
  userId: string,
) {
  return (
    localStorage.getItem(
      getStorageKey(userId),
    ) !== null
  );
}

function getServerVaultExists() {
  return false;
}

export function VaultApp({
  userId,
}: VaultAppProps) {
  const vaultExists =
    useSyncExternalStore(
      subscribeToStorage,
      () => getVaultExists(userId),
      getServerVaultExists,
    );

  const [status, setStatus] =
    useState<VaultStatus | null>(
      null,
    );

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [vault, setVault] =
    useState<Vault | null>(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const currentStatus =
    status ??
    (vaultExists
      ? "unlock"
      : "create");

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
        createEmptyVault();

      const encrypted =
        await encryptDUMPVault(
          password,
          newVault,
        );

      saveEncryptedVault(
        userId,
        encrypted,
      );

      setVault(newVault);
      setConfirmPassword("");
      setStatus("unlocked");
    } catch {
      setError(
        "Unable to create your vault.",
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

    const encryptedVault =
      getEncryptedVault(userId);

    if (!encryptedVault) {
      setError(
        "No vault was found.",
      );
      setStatus("create");
      return;
    }

    setIsLoading(true);

    try {
      const decrypted =
        await decryptDUMPVault(
          password,
          encryptedVault,
        );

      setVault(decrypted);
      setStatus("unlocked");
    } catch {
      setError(
        "Incorrect vault password.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddTestMemory() {
    if (
      !vault ||
      !password
    ) {
      return;
    }

    try {
      const memory =
        createMemory(
          "Text",
          "This is a DUMP memory.",
          "My first memory stored in DUMP",
        );

      const updatedVault =
        addMemory(
          vault,
          memory,
        );

      const encrypted =
        await encryptDUMPVault(
          password,
          updatedVault,
        );

      saveEncryptedVault(
        userId,
        encrypted,
      );

      setVault(updatedVault);
    } catch {
      setError(
        "Unable to save the memory.",
      );
    }
  }

  function handleLockVault() {
    setVault(null);
    setPassword("");
    setConfirmPassword("");
    setSearch("");
    setError("");
    setStatus("unlock");
  }

  const filteredMemories =
    vault?.memories.filter(
      (memory) =>
        memory.description
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          ),
    ) ?? [];

  if (
    currentStatus === "create" ||
    currentStatus === "unlock"
  ) {
    const isCreate =
      currentStatus === "create";

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
                autoComplete={
                  isCreate
                    ? "new-password"
                    : "current-password"
                }
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
                  autoComplete="new-password"
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
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
              placeholder="Search your memories..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>

          <Button
            onClick={
              handleAddTestMemory
            }
          >
            <Plus className="mr-2 size-4" />
            Add Test Memory
          </Button>
        </div>

        {filteredMemories.length ===
        0 ? (
          <Card>
            <CardContent className="flex min-h-48 items-center justify-center">
              <div className="text-center">
                <p className="font-medium">
                  No memories found
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Start dumping things you
                  want to remember.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMemories.map(
              (memory) => (
                <Card
                  key={memory.id}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-lg">
                        {
                          memory.description
                        }
                      </CardTitle>

                      <span className="shrink-0 rounded-full border px-2 py-1 text-xs">
                        {memory.type}
                      </span>
                    </div>

                    <CardDescription>
                      {new Date(
                        memory.createdAt,
                      ).toLocaleString()}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {memory.data}
                    </p>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}