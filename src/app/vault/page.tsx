import Link from "next/link";

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
    <main className="ground shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-2xl outline-none"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-violet text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--violet-deep)]"
              aria-hidden="true"
            >
              D
            </span>

            <span className="display text-xl sm:text-2xl">
              Dump
            </span>
          </Link>

          <span className="label-mono hidden rounded-full bg-lemon px-2.5 py-1.5 text-ink sm:inline-block">
            Vault
          </span>
        </div>

        <div className="label-mono max-w-[45%] truncate text-muted-foreground">
          {session.user.email}
        </div>
      </header>

      <VaultApp userId={userId} />
    </main>
  );
}
