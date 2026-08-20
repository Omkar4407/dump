import type { Metadata } from "next";

import {
  LegalPage,
  type LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy — DUMP",
  description:
    "How DUMP handles your memories: encrypted on your device, stored in your own Google Drive.",
};

/*
 * Every statement here describes behaviour that
 * is implemented in this repository. If the
 * implementation changes, this page must change
 * with it.
 */
const SECTIONS: LegalSection[] = [
  {
    number: "01",
    title: "The short version",
    body: [
      "DUMP has no database and no server that stores your memories. Everything you save is encrypted inside your browser and written to your own Google Drive. Nobody operating DUMP can read it, because the key never leaves your device.",
    ],
  },
  {
    number: "02",
    title: "What Google sign-in gives us",
    body: [
      "Signing in with Google provides your email address, your name and your profile picture, which are used to identify your session and to show you which account you are signed in as.",
      "DUMP requests only the drive.file permission. That scope limits access strictly to files DUMP itself creates. The rest of your Google Drive stays invisible to the application.",
      "Your Google access and refresh tokens are held in an encrypted session cookie so the application can talk to Drive on your behalf while you are signed in.",
    ],
  },
  {
    number: "03",
    title: "Your vault password",
    body: [
      "Your vault password is separate from your Google account and is never transmitted, never logged and never stored — not in the browser, not in a cookie, not on any server.",
      "It is used in your browser to derive an encryption key with PBKDF2-SHA-256 at 600,000 iterations. The resulting AES-GCM 256-bit key is marked non-exportable, is held only in memory, and is destroyed when you lock the vault, close the tab or reload the page.",
      "Because the password is never stored anywhere, it cannot be reset or recovered. This is deliberate, and it is the reason nobody else can read your vault.",
    ],
  },
  {
    number: "04",
    title: "Your memories and files",
    body: [
      "Memories are encrypted with AES-GCM in your browser before they are sent anywhere. Only the resulting ciphertext is uploaded to your Google Drive.",
      "Attachments — images, documents, audio and video — are encrypted the same way, individually, before upload. They are decrypted again in your browser when you open or download them.",
      "Google stores the encrypted file. Google cannot read its contents, and neither can DUMP.",
    ],
  },
  {
    number: "05",
    title: "Credentials are treated as secrets",
    body: [
      "For memories that store an account, the service name and username are searchable so you can find them. The password and the notes field are permanently excluded from every search path — they are never indexed, never embedded and never matched against a query.",
      "Passwords are never written to logs and never appear in a URL.",
    ],
  },
  {
    number: "06",
    title: "Search runs on your device",
    body: [
      "The search that understands what you mean runs entirely in your browser. Your memories are never uploaded anywhere to be searched, and no query you type is sent to a server.",
      "To do this, the browser downloads a small open-source language model the first time you unlock your vault. That download is an ordinary file request to a third-party model host and carries no information about your memories, your queries or your account.",
    ],
  },
  {
    number: "07",
    title: "No analytics, no tracking",
    body: [
      "DUMP contains no analytics, no telemetry, no advertising and no third-party tracking scripts of any kind.",
      "The only cookie used is the session cookie that keeps you signed in.",
    ],
  },
  {
    number: "08",
    title: "Who else is involved",
    body: [
      "Google, for sign-in and for storing your encrypted vault in your own Drive. Your use of Google is governed by Google's own privacy policy.",
      "The host that serves the model file used for on-device search.",
      "Whoever hosts the DUMP application itself. As with any website, a host may keep ordinary request logs such as IP addresses and timestamps. These logs contain no memory content, because memory content never reaches the server in readable form.",
    ],
  },
  {
    number: "09",
    title: "Staying in control",
    body: [
      "You can delete any memory from inside the vault, which also removes its encrypted attachments from your Drive.",
      "You can revoke DUMP's access to your Google account at any time from your Google account permissions page.",
      "Because the vault lives in your own Drive, you can delete the encrypted vault file directly and remove everything at once.",
    ],
  },
  {
    number: "10",
    title: "Changes",
    body: [
      "If the way DUMP handles data changes, this page changes with it, and the date above is updated.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your memories stay yours."
      summary="DUMP is built so that the people running it cannot read what you store. This page explains exactly what that means and where your data actually goes."
      updated="20 August 2026"
      sections={SECTIONS}
    />
  );
}
