import type { Memory } from "@/types/memory";

/*
 * SECURITY BOUNDARY.
 *
 * A credential memory stores a JSON payload:
 *
 *   { name, username, password, notes }
 *
 * The password is a secret and the notes field
 * is documented to the user as the place for
 * recovery codes and security answers, so both
 * are permanently excluded from every search
 * path — lexical and semantic alike.
 *
 * The service name and the username are the
 * only parts a person actually searches for
 * ("netflix", "github"), and without them a
 * credential is reachable only by whatever
 * description the user happened to type. Those
 * two fields — and nothing else — are exposed
 * to retrieval here.
 *
 * If the payload is not a JSON object (older
 * or hand-written vaults may store a bare
 * string), nothing is exposed at all.
 */

const SEARCHABLE_CREDENTIAL_KEYS = [
  "name",
  "username",
] as const;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function getSearchableCredentialText(
  memory: Memory,
): string {
  if (memory.type !== "Credential") {
    return "";
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(memory.data);
  } catch {
    /*
     * A non-JSON payload is treated as an
     * opaque secret and never exposed.
     */
    return "";
  }

  if (!isRecord(parsed)) {
    return "";
  }

  const parts: string[] = [];

  for (const key of SEARCHABLE_CREDENTIAL_KEYS) {
    const value = parsed[key];

    if (
      typeof value !== "string"
    ) {
      continue;
    }

    const normalized = value.trim();

    if (normalized) {
      parts.push(normalized);
    }
  }

  return parts.join(" ");
}
