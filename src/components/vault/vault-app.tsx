"use client";

import { useEffect, useState } from "react";
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
  decryptVault,
  encryptVault,
  type EncryptedVault,
} from "@/lib/crypto/vault";

import {
  loadRemoteVault,
  createRemoteVault,
  updateRemoteVault,
} from "@/lib/vault/remote";

import type {
  Memory,
  Vault,
} from "@/types/memory";

type VaultStatus =
  | "loading"
  | "create"
  | "unlock"
  | "unlocked";

type VaultAppProps = {
  userId: string;
};

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
  ] =
    useState<EncryptedVault | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

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
          setStatus("create");
          return;
        }

        setEncryptedVault(
          result.vault,
        );

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
      const newVault: Vault = {
        version: 1,
        memories: [],
      };

      const encrypted =
        await encryptVault(
          password,
          newVault,
        );

      await createRemoteVault(
        encrypted,
      );

      setVault(newVault);
      setEncryptedVault(
        encrypted,
      );
      setConfirmPassword("");
      setStatus("unlocked");
    } catch (error) {
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

    setIsLoading(true);

    try {
      const decrypted =
        await decryptVault<Vault>(
          password,
          encryptedVault,
        );

      if (
        decrypted.version !== 1 ||
        !Array.isArray(
          decrypted.memories,
        )
      ) {
        throw new Error(
          "Invalid vault format.",
        );
      }

      setVault(decrypted);
      setStatus("unlocked");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Incorrect vault password.",
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

    setError("");
    setIsLoading(true);

    try {
      const now =
        new Date().toISOString();

      const memory: Memory = {
        id: crypto.randomUUID(),
        type: "Text",
        data: "This is a DUMP memory.",
        description:
          "My first memory stored in DUMP",
        createdAt: now,
        updatedAt: now,
      };

      const updatedVault: Vault = {
        ...vault,
        memories: [
          ...vault.memories,
          memory,
        ],
      };

      const encrypted =
        await encryptVault(
          password,
          updatedVault,
        );

      await updateRemoteVault(
        encrypted,
      );

      setVault(updatedVault);
      setEncryptedVault(
        encrypted,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save the memory.",
      );
    } finally {
      setIsLoading(false);
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
            disabled={isLoading}
            onClick={
              handleAddTestMemory
            }
          >
            <Plus className="mr-2 size-4" />
            Add Test Memory
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