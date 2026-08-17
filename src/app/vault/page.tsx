import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function VaultPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-12">
        <h1 className="text-3xl font-semibold">
          Welcome to DUMP
        </h1>

        <div className="mt-8 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            Signed in as
          </p>

          <p className="mt-2 text-lg font-medium">
            {session.user.email}
          </p>
        </div>
      </div>
    </main>
  );
}