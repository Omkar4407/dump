import type { Memory } from "@/types/memory";

/*
 * Shared evaluation corpus.
 *
 * A realistic personal vault: the kind of
 * mixed, messy, under-described memories a
 * real user dumps and later half-remembers.
 *
 * Descriptions deliberately avoid restating
 * the query vocabulary, so retrieval has to
 * understand meaning rather than match words.
 */

function memory(
  id: string,
  type: Memory["type"],
  description: string,
  data: string,
  tags: string[] = [],
  metadata: Record<string, string> = {},
): Memory {
  const now = "2026-08-01T10:00:00.000Z";

  return {
    id,
    type,
    data,
    description,
    tags,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export const EVAL_MEMORIES: Memory[] = [
  /* Clothing / sizing */
  memory(
    "pant-size",
    "Text",
    "Pant size",
    "Waist 32, inseam 30. Slim fit runs one size small.",
    ["measurements"],
  ),
  memory(
    "shirt-size",
    "Text",
    "Shirt measurements",
    "Medium in most brands, large in Uniqlo. Collar 15.5 inches.",
    ["measurements"],
  ),
  memory(
    "shoe-size",
    "Text",
    "Shoe size",
    "UK 9, EU 43. Running shoes half a size bigger.",
    [],
  ),
  memory(
    "winter-jacket",
    "Link",
    "Winter jacket I want",
    "https://example.com/products/down-parka-charcoal",
    ["wishlist"],
  ),

  /* College */
  memory(
    "dbms-assignment",
    "Text",
    "DBMS assignment deadline",
    "Normalization problem set due 14 September, submit on the portal.",
    ["semester5"],
  ),
  memory(
    "college-wifi",
    "Credential",
    "Campus network login",
    JSON.stringify({
      name: "University WiFi",
      username: "21bce1043",
      password: "Zq7VaultSecret9931",
      notes: "",
    }),
    [],
  ),
  memory(
    "exam-timetable",
    "Text",
    "End semester exam schedule",
    "Maths on the 2nd, DBMS on the 5th, OS on the 9th. Hall 3.",
    ["semester5"],
  ),
  memory(
    "professor-email",
    "Text",
    "Guide's contact",
    "Dr. Menon, project guide, menon@university.edu, cabin 214.",
    [],
  ),

  /* Programming / work */
  memory(
    "debounce-snippet",
    "Code",
    "Debounce helper",
    "export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }",
    [],
    { language: "javascript" },
  ),
  memory(
    "git-undo",
    "Text",
    "Undo last commit without losing work",
    "git reset --soft HEAD~1 keeps the changes staged.",
    ["cheatsheet"],
  ),
  memory(
    "github-login",
    "Credential",
    "GitHub account",
    JSON.stringify({
      name: "GitHub",
      username: "omkar@example.com",
      password: "Zq7VaultSecret9931",
      notes: "",
    }),
    [],
  ),
  memory(
    "docker-compose",
    "Code",
    "Local postgres for side projects",
    "services:\n  db:\n    image: postgres:16\n    ports: ['5432:5432']",
    [],
    { language: "yaml" },
  ),
  memory(
    "deploy-steps",
    "Text",
    "How I ship the portfolio",
    "Push to main, Vercel builds automatically, check the preview URL first.",
    [],
  ),

  /* Money */
  memory(
    "bank-ifsc",
    "Text",
    "Account details for transfers",
    "IFSC HDFC0001234, account ending 8871, branch Koramangala.",
    [],
  ),
  memory(
    "rent-split",
    "Text",
    "Monthly rent split",
    "Total 24000. My share 8000, due on the 5th to Arjun.",
    ["flat"],
  ),
  memory(
    "netflix-login",
    "Credential",
    "Streaming subscription",
    JSON.stringify({
      name: "Netflix",
      username: "family@example.com",
      password: "Zq7VaultSecret9931",
      notes: "",
    }),
    [],
  ),

  /* Health */
  memory(
    "blood-group",
    "Text",
    "Blood group",
    "O positive. Last donated in March.",
    ["medical"],
  ),
  memory(
    "dentist",
    "Text",
    "Dentist appointment",
    "Dr. Roy, 4pm on the 12th, second floor above the pharmacy.",
    ["medical"],
  ),
  memory(
    "gym-routine",
    "Text",
    "Push day routine",
    "Bench 4x8, incline dumbbell 3x10, overhead press 3x10, dips to failure.",
    ["fitness"],
  ),

  /* Home / life */
  memory(
    "wifi-home",
    "Credential",
    "Home broadband",
    JSON.stringify({
      name: "Airtel Fiber",
      username: "admin",
      password: "Zq7VaultSecret9931",
      notes: "",
    }),
    [],
  ),
  memory(
    "parking-spot",
    "Text",
    "Where I park",
    "Basement 2, pillar C14, near the service lift.",
    [],
  ),
  memory(
    "biryani-recipe",
    "Text",
    "Mum's biryani method",
    "Soak rice 30 minutes, fry onions till deep brown, layer and dum for 20 minutes.",
    ["cooking"],
  ),
  memory(
    "plant-care",
    "Text",
    "Monstera watering",
    "Water when the top two inches are dry, roughly every 9 days.",
    [],
  ),

  /* Travel */
  memory(
    "passport-number",
    "Text",
    "Passport details",
    "Number Z1234567, issued Bengaluru, expires 2031.",
    ["documents"],
  ),
  memory(
    "goa-trip",
    "Text",
    "Goa trip plan",
    "Train on Friday night, stay in Anjuna, rent a scooter for three days.",
    ["travel"],
  ),
  memory(
    "flight-checklist",
    "Text",
    "Things to carry on flights",
    "Charger, adapter, noise cancelling headphones, printed hotel booking.",
    ["travel"],
  ),

  /* Media / misc */
  memory(
    "book-list",
    "Text",
    "Books to read next",
    "The Design of Everyday Things, Project Hail Mary, Thinking Fast and Slow.",
    [],
  ),
  memory(
    "colour-tool",
    "Link",
    "Colour picker I keep losing",
    "https://oklch.com",
    ["design"],
  ),
  memory(
    "photo-backup",
    "Text",
    "Where the old photos are",
    "External drive labelled BLUE, folder Archive2019, also mirrored on Drive.",
    [],
  ),
];

export type EvalCase = {
  query: string;
  /* Memory IDs that a good result set must surface. */
  relevant: string[];
  note: string;
};

export const EVAL_CASES: EvalCase[] = [
  /* The product's own promised behaviour. */
  {
    query: "fashion",
    relevant: ["pant-size", "shirt-size", "shoe-size", "winter-jacket"],
    note: "concept word never written in any memory",
  },
  {
    query: "clothes",
    relevant: ["pant-size", "shirt-size", "winter-jacket"],
    note: "category word never written in any memory",
  },
  {
    query: "what should I wear",
    relevant: ["pant-size", "shirt-size", "shoe-size", "winter-jacket"],
    note: "natural language question",
  },
  {
    query: "college assignment",
    relevant: ["dbms-assignment"],
    note: "two-word topical query",
  },
  {
    query: "software development",
    relevant: ["debounce-snippet", "git-undo", "docker-compose", "deploy-steps"],
    note: "domain phrase never written in any memory",
  },
  {
    query: "github password",
    relevant: ["github-login"],
    note: "credential by service name",
  },

  /* Everyday recall. */
  {
    query: "my size",
    relevant: ["pant-size", "shirt-size", "shoe-size"],
    note: "vague possessive query",
  },
  {
    query: "when is my exam",
    relevant: ["exam-timetable"],
    note: "question form",
  },
  {
    query: "wifi password",
    relevant: ["wifi-home", "college-wifi"],
    note: "two credentials, both valid",
  },
  {
    query: "how do I undo a commit",
    relevant: ["git-undo"],
    note: "question matching content not title",
  },
  {
    query: "money",
    relevant: ["bank-ifsc", "rent-split"],
    note: "broad concept",
  },
  {
    query: "bank account",
    relevant: ["bank-ifsc"],
    note: "topical",
  },
  {
    query: "doctor",
    relevant: ["dentist"],
    note: "hypernym of dentist",
  },
  {
    query: "workout",
    relevant: ["gym-routine"],
    note: "synonym of gym",
  },
  {
    query: "cooking",
    relevant: ["biryani-recipe"],
    note: "tag and concept",
  },
  {
    query: "recipe",
    relevant: ["biryani-recipe"],
    note: "synonym never written",
  },
  {
    query: "travel documents",
    relevant: ["passport-number", "goa-trip", "flight-checklist"],
    note: "compound topical",
  },
  {
    query: "vacation",
    relevant: ["goa-trip", "flight-checklist"],
    note: "synonym of trip",
  },
  {
    query: "where did I park",
    relevant: ["parking-spot"],
    note: "question form",
  },
  {
    query: "watering plants",
    relevant: ["plant-care"],
    note: "gerund form",
  },
  {
    query: "what to read",
    relevant: ["book-list"],
    note: "natural language",
  },

  /* Lexical robustness. */
  {
    query: "biryani",
    relevant: ["biryani-recipe"],
    note: "exact token",
  },
  {
    query: "biriyani",
    relevant: ["biryani-recipe"],
    note: "common misspelling",
  },
  {
    query: "githb",
    relevant: ["github-login"],
    note: "typo",
  },
  {
    query: "monstera",
    relevant: ["plant-care"],
    note: "rare exact token in content",
  },
  {
    query: "postgres",
    relevant: ["docker-compose"],
    note: "token inside code",
  },
  {
    query: "IFSC",
    relevant: ["bank-ifsc"],
    note: "acronym in content",
  },
  {
    query: "blood group",
    relevant: ["blood-group"],
    note: "exact description",
  },
  {
    query: "passport",
    relevant: ["passport-number"],
    note: "exact token",
  },
  {
    query: "netflix",
    relevant: ["netflix-login"],
    note: "service name only inside credential payload",
  },
];
