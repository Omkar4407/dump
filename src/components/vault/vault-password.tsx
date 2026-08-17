"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VaultMode = "create" | "unlock";

const VAULT_CREATED_KEY = "dump-vault-created";

export function VaultPassword() {
  const [mode, setMode] = useState<VaultMode>("create");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function resetErrors() {
    setError("");
  }

  async function handleCreateVault() {
    resetErrors();

    if (!password) {
      setError("Please enter a vault password.");
      return;
    }

    if (password.length < 8) {
      setError("Vault password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    // Temporary Phase 3.2 behavior.
    // Actual encryption will be implemented in Step 3.3.
    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem(VAULT_CREATED_KEY, "true");

    setPassword("");
    setConfirmPassword("");
    setIsLoading(false);
    setMode("unlock");
  }

  async function handleUnlockVault() {
    resetErrors();

    if (!password) {
      setError("Please enter your vault password.");
      return;
    }

    setIsLoading(true);

    // Temporary Phase 3.2 behavior.
    // Actual password verification will be implemented in Step 3.3.
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsLoading(false);

    setError(
      "Password verification will be enabled in the encryption step.",
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-muted">
            {mode === "create" ? (
              <ShieldCheck className="size-5" />
            ) : (
              <LockKeyhole className="size-5" />
            )}
          </div>

          <CardTitle className="text-2xl">
            {mode === "create"
              ? "Create your Vault Password"
              : "Unlock your Vault"}
          </CardTitle>

          <CardDescription>
            {mode === "create"
              ? "Your vault password protects access to your private memories."
              : "Enter your vault password to access your private memories."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="vault-password">
                Vault Password
              </Label>

              <Input
                id="vault-password"
                type="password"
                placeholder="Enter your vault password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  resetErrors();
                }}
                autoComplete={
                  mode === "create"
                    ? "new-password"
                    : "current-password"
                }
              />
            </div>

            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="confirm-vault-password">
                  Confirm Password
                </Label>

                <Input
                  id="confirm-vault-password"
                  type="password"
                  placeholder="Confirm your vault password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    resetErrors();
                  }}
                  autoComplete="new-password"
                />
              </div>
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
                mode === "create"
                  ? handleCreateVault
                  : handleUnlockVault
              }
            >
              {isLoading
                ? "Please wait..."
                : mode === "create"
                  ? "Create Vault"
                  : "Unlock Vault"}
            </Button>

            {mode === "unlock" && (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  localStorage.removeItem(VAULT_CREATED_KEY);
                  setMode("create");
                  setPassword("");
                  setError("");
                }}
              >
                Reset local vault state
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}