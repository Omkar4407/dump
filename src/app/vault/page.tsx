import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { VaultApp } from "@/components/vault/vault-app";

export default async function VaultPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const userId =
    session.user.email ??
    session.user.id ??
    "unknown-user";

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md border bg-muted/30">
              <span className="text-sm font-semibold tracking-tight">
                D
              </span>
            </div>

            <div>
              <div className="text-sm font-semibold tracking-tight">
                DUMP
              </div>

              <div className="hidden text-[11px] text-muted-foreground sm:block">
                Private memory vault
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-foreground/50" />
              Secure
            </div>

            <div className="hidden max-w-48 truncate text-xs text-muted-foreground md:block">
              {session.user.email}
            </div>
          </div>
        </div>
      </header>

      <VaultApp userId={userId} />
    </main>
  );
}