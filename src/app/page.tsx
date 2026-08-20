import Link from "next/link";

import { auth } from "@/auth";

import { SignInButton } from "@/components/auth/sign-in-button";

import { Button } from "@/components/ui/button";

import {
  Confetti,
  Ring,
  Squiggle,
  Triangle,
  Zigzag,
} from "@/components/decor/memphis";

const STEPS = [
  {
    number: "01",
    title: "Dump",
    line: "Save anything.",
    tile: "bg-coral text-ink",
    edge: "[--edge:var(--coral-deep)]",
  },
  {
    number: "02",
    title: "Search",
    line: "Ask naturally.",
    tile: "bg-mint text-ink",
    edge: "[--edge:var(--mint-deep)]",
  },
  {
    number: "03",
    title: "Retrieve",
    line: "Find what you meant.",
    tile: "bg-lemon text-ink",
    edge: "[--edge:var(--lemon-deep)]",
  },
] as const;

export default async function Home() {
  const session = await auth();

  const isSignedIn = Boolean(session?.user);

  return (
    <main className="ground shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-9 items-center justify-center rounded-2xl bg-violet text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--violet-deep)]"
            aria-hidden="true"
          >
            D
          </span>

          <span className="display text-xl sm:text-2xl">
            Dump
          </span>
        </div>

        {isSignedIn ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/vault">
              Go to vault
              <span aria-hidden="true">→</span>
            </Link>
          </Button>
        ) : (
          <SignInButton label="Enter" size="sm" variant="outline" />
        )}
      </header>

      {/*
        The bento fills whatever height is left
        and scrolls inside itself only when a
        viewport is too short to hold it, so the
        page itself never scrolls.
      */}
      <div className="tile-scroll min-h-0 flex-1 px-4 sm:px-6">
        <div className="grid min-h-full auto-rows-min grid-cols-1 gap-3 sm:gap-4 lg:h-full lg:min-h-0 lg:auto-rows-auto lg:grid-cols-12 lg:grid-rows-6">
          <section className="tile relative flex min-h-52 flex-col justify-center overflow-hidden bg-card p-6 [--edge:var(--border)] sm:p-8 lg:col-span-8 lg:row-span-4">
            <Squiggle
              className="pointer-events-none absolute -top-2 right-6 h-10 w-32 text-mint"
            />

            <Confetti
              className="pointer-events-none absolute right-6 bottom-4 size-16 text-violet/35"
            />

            <p className="label-mono text-violet">
              Private memory vault
            </p>

            <h1 className="display mt-3 text-[clamp(2.25rem,6.2vw,4.75rem)]">
              <span className="block">Store first.</span>

              <span className="block text-violet">
                Organize never.
              </span>

              <span className="block">Retrieve naturally.</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-snug text-muted-foreground sm:text-lg">
              Dump anything worth remembering. It is encrypted on your
              device, kept in your own Drive, and found again by asking
              for it the way you actually think about it.
            </p>
          </section>

          <section className="tile relative flex min-h-52 flex-col justify-between gap-5 overflow-hidden bg-violet p-6 text-white [--edge:var(--violet-deep)] sm:p-7 lg:col-span-4 lg:row-span-4">
            <Ring className="pointer-events-none absolute -top-6 -right-6 size-28 text-lemon/70" />

            <Triangle className="pointer-events-none absolute bottom-16 left-4 size-8 text-mint/80" />

            <div className="relative">
              <p className="label-mono text-lemon">
                Start here
              </p>

              <p className="display mt-3 text-2xl sm:text-3xl">
                Your vault is one tap away.
              </p>

              <p className="mt-3 text-sm leading-snug text-white/80">
                Sign in with Google, set a vault password, and start
                dumping.
              </p>
            </div>

            <div className="relative flex flex-col gap-3">
              {isSignedIn ? (
                <Button
                  asChild
                  size="lg"
                  variant="lemon"
                  className="w-full"
                >
                  <Link href="/vault">
                    Open your vault
                    <span aria-hidden="true">→</span>
                  </Link>
                </Button>
              ) : (
                <SignInButton
                  size="lg"
                  variant="lemon"
                  fullWidth
                />
              )}

              <p className="label-mono text-white/70">
                End-to-end encrypted
              </p>
            </div>
          </section>

          {STEPS.map((step) => (
            <section
              key={step.number}
              className={`tile relative flex min-h-28 flex-col justify-between overflow-hidden p-5 sm:p-6 lg:col-span-4 lg:row-span-2 ${step.tile} ${step.edge}`}
            >
              <Zigzag className="pointer-events-none absolute -right-4 -bottom-3 h-9 w-28 text-ink/15" />

              <span className="display text-3xl opacity-45 sm:text-4xl">
                {step.number}
              </span>

              <div className="relative mt-3">
                <h2 className="display text-xl sm:text-2xl">
                  {step.title}
                </h2>

                <p className="mt-1 text-sm font-medium opacity-80 sm:text-base">
                  {step.line}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <span className="label-mono text-muted-foreground">
          Private by design
        </span>

        <nav
          className="flex items-center gap-4"
          aria-label="Legal"
        >
          <Link
            href="/privacy"
            className="label-mono rounded-full text-muted-foreground underline decoration-violet decoration-2 underline-offset-4 outline-none hover:text-foreground"
          >
            Privacy
          </Link>

          <Link
            href="/terms"
            className="label-mono rounded-full text-muted-foreground underline decoration-violet decoration-2 underline-offset-4 outline-none hover:text-foreground"
          >
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}
