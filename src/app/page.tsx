import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <header className="flex h-20 items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">
            DUMP
          </div>

          <Button variant="outline">
            Sign in
          </Button>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Your private memory vault
            </p>

            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              Store First.
              <br />
              Organize Never.
              <br />
              Retrieve Naturally.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Dump anything you want to remember. Keep it private.
              Find it when you need it.
            </p>

            <div className="mt-8 flex justify-center">
              <Button size="lg">
                Continue with Google
              </Button>
            </div>
          </div>
        </section>

        <footer className="flex h-16 items-center justify-center text-sm text-muted-foreground">
          Private by design.
        </footer>
      </div>
    </main>
  );
}