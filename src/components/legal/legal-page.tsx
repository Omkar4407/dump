import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Confetti,
  Squiggle,
} from "@/components/decor/memphis";

export type LegalSection = {
  number: string;
  title: string;
  body: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
};

/*
 * Shared shell for the legal pages.
 *
 * Same single-screen contract as the rest of
 * DUMP: the page itself never scrolls, and the
 * document scrolls inside its own tile.
 */
export function LegalPage({
  eyebrow,
  title,
  summary,
  updated,
  sections,
}: LegalPageProps) {
  return (
    <main className="ground shell flex flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-2xl outline-none"
        >
          <span
            className="flex size-9 items-center justify-center rounded-2xl bg-violet text-lg font-extrabold text-white shadow-[0_4px_0_0_var(--violet-deep)]"
            aria-hidden="true"
          >
            D
          </span>

          <span className="display text-xl sm:text-2xl">
            Dump
          </span>
        </Link>

        <Button asChild size="sm" variant="outline">
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      </header>

      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="tile flex h-full min-h-0 flex-col overflow-hidden bg-card [--edge:var(--border)]">
          <div className="relative shrink-0 overflow-hidden bg-violet/12 px-5 py-5 sm:px-8 sm:py-6">
            <Squiggle className="pointer-events-none absolute -top-1 right-8 h-8 w-24 text-mint" />

            <Confetti className="pointer-events-none absolute -right-3 -bottom-5 size-16 text-violet/25" />

            <p className="label-mono relative text-violet">
              {eyebrow}
            </p>

            <h1 className="display relative mt-2 text-[clamp(1.75rem,5vw,2.75rem)]">
              {title}
            </h1>

            <p className="relative mt-3 max-w-2xl leading-snug font-medium text-muted-foreground">
              {summary}
            </p>

            <p className="label-mono relative mt-3 text-muted-foreground">
              Last updated {updated}
            </p>
          </div>

          <div className="tile-scroll px-5 py-6 sm:px-8">
            <div className="flex max-w-3xl flex-col gap-7">
              {sections.map((section) => (
                <section
                  key={section.number}
                  className="flex flex-col gap-2"
                >
                  <h2 className="flex items-baseline gap-3">
                    <span
                      className="label-mono shrink-0 text-violet"
                      aria-hidden="true"
                    >
                      {section.number}
                    </span>

                    <span className="display text-lg sm:text-xl">
                      {section.title}
                    </span>
                  </h2>

                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className="pl-0 leading-relaxed text-muted-foreground sm:pl-10"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}

              <p className="rounded-2xl bg-lemon/25 px-4 py-3 text-sm leading-relaxed font-medium">
                DUMP is an independent personal project, provided as
                is. This document is written in plain language to
                describe how the application actually behaves. It is
                not legal advice, and it has not been reviewed by a
                lawyer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
