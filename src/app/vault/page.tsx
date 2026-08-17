import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { VaultPassword } from "@/components/vault/vault-password";

export default async function VaultPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex h-20 items-center border-b px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">
            DUMP
          </div>

          <div className="text-sm text-muted-foreground">
            {session.user.email}
          </div>
        </div>
      </header>

      <VaultPassword />
    </main>
  );
}