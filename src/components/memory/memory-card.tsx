"use client";

import { memo } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { MemoryTypeIcon } from "@/components/memory/memory-type-icon";

import {
  MEMORY_TYPE_STYLES,
  formatMemoryDate,
  getMemorySummaryLine,
} from "@/lib/memory/memory-display";

import type { Memory } from "@/types/memory";

type MemoryCardProps = {
  memory: Memory;
  index: number;
  searchMatches?: string[];
  onOpen: (memory: Memory) => void;
  onEdit: (memory: Memory) => void;
  onRequestDelete: (memory: Memory) => void;
};

const MATCH_LABELS: Record<string, string> = {
  exact: "Exact",
  description: "Title",
  content: "Content",
  tag: "Tag",
  metadata: "Details",
  attachment: "Attachment",
  type: "Type",
  semantic: "Related",
};

const MAX_VISIBLE_TAGS = 3;

function MatchContext({
  matches,
}: {
  matches: string[];
}) {
  if (matches.length === 0) {
    return null;
  }

  const visible = [
    ...new Set(
      matches.map(
        (match) => MATCH_LABELS[match] ?? match,
      ),
    ),
  ].slice(0, 3);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label-mono text-muted-foreground">
        Matched in
      </span>

      {visible.map((label) => (
        <span
          key={label}
          className="label-mono rounded-full bg-violet px-2 py-1 text-white"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/*
 * A memory card is a summary tile.
 *
 * CRITICAL:
 *
 * It must never render memory content —
 * no text bodies, passwords, code, URLs,
 * previews or players. Content lives in
 * the memory detail view only.
 */
export const MemoryCard = memo(function MemoryCard({
  memory,
  index,
  searchMatches = [],
  onOpen,
  onEdit,
  onRequestDelete,
}: MemoryCardProps) {
  const tags = memory.tags ?? [];

  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);

  const hiddenTagCount = tags.length - visibleTags.length;

  const summaryLine = getMemorySummaryLine(memory);

  const style = MEMORY_TYPE_STYLES[memory.type];

  const recordNumber = String(index + 1).padStart(2, "0");

  return (
    <article
      className={`tile lift group relative flex h-full w-full flex-col gap-3 bg-card p-4 sm:p-5 ${style.edge}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${style.chip}`}
          >
            <MemoryTypeIcon
              type={memory.type}
              className="size-4"
            />
          </span>

          <span className="label-mono min-w-0 truncate text-muted-foreground">
            {memory.type} · {recordNumber}
          </span>
        </div>

        <div className="relative z-10 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(memory)}
            aria-label={`Edit ${memory.description}`}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-mint hover:text-ink"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onRequestDelete(memory)}
            aria-label={`Delete ${memory.description}`}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-coral hover:text-ink"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <h3 className="display text-lg break-words sm:text-xl">
        <button
          type="button"
          onClick={() => onOpen(memory)}
          className="rounded-lg text-left outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
        >
          {memory.description}
        </button>
      </h3>

      <div className="label-mono flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        <span>
          {formatMemoryDate(memory.updatedAt)}
        </span>

        {summaryLine && (
          <>
            <span aria-hidden="true">·</span>

            <span className="max-w-full truncate normal-case">
              {summaryLine}
            </span>
          </>
        )}
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <li
              key={tag}
              className={`label-mono rounded-full px-2 py-1 ${style.tint}`}
            >
              #{tag}
            </li>
          ))}

          {hiddenTagCount > 0 && (
            <li className="label-mono rounded-full bg-secondary px-2 py-1 text-muted-foreground">
              +{hiddenTagCount}
            </li>
          )}
        </ul>
      )}

      <MatchContext matches={searchMatches} />

      <div
        className="label-mono mt-auto flex items-center gap-1.5 pt-1 text-violet"
        aria-hidden="true"
      >
        Open
        <span className="transition-transform duration-150 group-hover:translate-x-1">
          →
        </span>
      </div>
    </article>
  );
});
