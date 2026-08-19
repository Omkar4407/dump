import assert from "node:assert/strict";

import {
  SemanticIndex,
} from "@/lib/memory/search/semantic-index";

import {
  searchHybrid,
} from "@/lib/memory/search/hybrid-search";

import type {
  Memory,
} from "@/types/memory";

function createMemory(
  id: string,
  description: string,
  data: string,
  tags: string[] = [],
): Memory {
  const now =
    new Date().toISOString();

  return {
    id,
    type: "Text",
    description,
    data,
    tags,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

const memories: Memory[] = [
  /*
   * TARGET MEMORIES
   */
  createMemory(
    "pants-size",
    "Pant size",
    "Waist 34 inches. Pants fit information.",
    ["clothing"],
  ),

  createMemory(
    "programming",
    "Programming notes",
    "Software development, coding, algorithms and programming.",
    ["coding"],
  ),

  createMemory(
    "travel",
    "Travel documents",
    "Passport, flights, hotels and trip planning.",
    ["travel"],
  ),

  createMemory(
    "birthday",
    "Mom birthday",
    "Mom's birthday is on June 30.",
    ["family"],
  ),

  createMemory(
    "college",
    "College project",
    "College assignment and project work.",
    ["college"],
  ),

  /*
   * DISTRACTOR MEMORIES
   */
  createMemory(
    "cooking",
    "Cooking recipes",
    "Tomatoes, onions, pasta, herbs and olive oil.",
    ["food"],
  ),

  createMemory(
    "movies",
    "Movie recommendations",
    "Movies, actors, cinema and entertainment.",
  ),

  createMemory(
    "books",
    "Books to read",
    "Novels, fiction, reading list and authors.",
  ),

  createMemory(
    "music",
    "Music playlist",
    "Songs, artists, albums and playlists.",
  ),

  createMemory(
    "gym",
    "Gym routine",
    "Workout exercises, strength training and fitness.",
  ),

  createMemory(
    "cars",
    "Car research",
    "Cars, vehicles, engines and automobile research.",
  ),

  createMemory(
    "shopping",
    "Shopping list",
    "Things I need to buy from the store.",
  ),

  createMemory(
    "resume",
    "Resume",
    "Education, projects, skills and work experience.",
  ),

  createMemory(
    "internship",
    "Internship applications",
    "Internship applications, companies and interviews.",
  ),

  createMemory(
    "events",
    "Upcoming events",
    "Events, dates, schedules and reminders.",
  ),

  createMemory(
    "finance",
    "Finance notes",
    "Expenses, savings, budgeting and financial planning.",
  ),

  createMemory(
    "contacts",
    "Important contacts",
    "Names, phone numbers and contact information.",
  ),

  createMemory(
    "passwords",
    "Account notes",
    "Online accounts and login information.",
  ),

  createMemory(
    "photography",
    "Photography notes",
    "Cameras, lenses, photos and editing.",
  ),

  createMemory(
    "technology",
    "Technology notes",
    "Computers, phones, applications and technology.",
  ),

  createMemory(
    "health",
    "Health notes",
    "General health routines and appointments.",
  ),

  createMemory(
    "food-shopping",
    "Grocery list",
    "Milk, vegetables, fruits and household groceries.",
  ),

  createMemory(
    "college-exam",
    "Exam preparation",
    "Study notes, examinations and revision.",
  ),

  createMemory(
    "web-development",
    "Web development",
    "HTML, CSS, JavaScript and websites.",
  ),

  createMemory(
    "database",
    "Database notes",
    "SQL, tables, queries and database systems.",
  ),

  createMemory(
    "networking",
    "Networking notes",
    "TCP, IP, routing, protocols and computer networks.",
  ),
];

async function runQuery(
  query: string,
  expectedId: string,
): Promise<void> {
  const index =
    new SemanticIndex();

  await index.rebuild(
    memories,
  );

  const response =
    await searchHybrid(
      query,
      memories,
      index,
      {
        finalLimit: 10,
      },
    );

  console.log(
    `\n========== ${query} ==========`,
  );

  console.log(
    response.results.map(
      (result) => ({
        id:
          result.memory.id,

        description:
          result.memory.description,

        score:
          Number(
            result.score.toFixed(
              4,
            ),
          ),

        sources:
          result.sources,
      }),
    ),
  );

  const position =
    response.results.findIndex(
      (result) =>
        result.memory.id ===
        expectedId,
    );

  assert.ok(
    position >= 0,
    `"${query}" should retrieve "${expectedId}"`,
  );

  assert.ok(
    position < 5,
    `"${query}" should rank "${expectedId}" within top 5; got position ${position + 1}`,
  );

  console.log(
    `PASS: ${query} → ${expectedId} (#${position + 1})`,
  );
}

async function main(): Promise<void> {
  await runQuery(
    "fashion",
    "pants-size",
  );

  await runQuery(
    "clothes",
    "pants-size",
  );

  await runQuery(
    "what should I wear",
    "pants-size",
  );

  await runQuery(
    "body measurements",
    "pants-size",
  );

  await runQuery(
    "coding",
    "programming",
  );

  await runQuery(
    "software development",
    "programming",
  );

  await runQuery(
    "trip",
    "travel",
  );

  await runQuery(
    "travel plans",
    "travel",
  );

  await runQuery(
    "birthday",
    "birthday",
  );

  await runQuery(
    "college assignment",
    "college",
  );

  console.log(
    "\nSTEP 5.16A LARGE-VAULT RETRIEVAL TESTS PASSED",
  );
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode = 1;
  },
);