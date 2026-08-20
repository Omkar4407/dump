import type { Metadata } from "next";

import {
  LegalPage,
  type LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms — DUMP",
  description:
    "The terms of using DUMP, including the one that matters most: a lost vault password cannot be recovered.",
};

const SECTIONS: LegalSection[] = [
  {
    number: "01",
    title: "What DUMP is",
    body: [
      "DUMP is an independent personal project: a private memory vault that encrypts what you save on your own device and stores it in your own Google Drive.",
      "It is provided as is, without warranty of any kind, and without any guarantee of availability, fitness for a particular purpose or continued operation.",
    ],
  },
  {
    number: "02",
    title: "A lost vault password cannot be recovered",
    body: [
      "This is the most important term on this page. Your vault password never leaves your device and is never stored anywhere, so there is no reset link, no recovery code and no administrator who can restore access.",
      "If you forget your vault password, every memory in your vault becomes permanently unreadable. Not difficult to read — impossible. Choose a password you will not lose, and consider keeping it somewhere safe and separate.",
    ],
  },
  {
    number: "03",
    title: "You need a Google account",
    body: [
      "DUMP signs you in with Google and stores your encrypted vault in your Google Drive. Your use of those services is governed by Google's own terms, and the storage available to you is whatever your Google account provides.",
      "If you revoke DUMP's access or lose access to your Google account, you lose access to the vault stored inside it.",
    ],
  },
  {
    number: "04",
    title: "Your data is your responsibility",
    body: [
      "You decide what to store. You are responsible for the content you save and for complying with any laws that apply to it.",
      "Because your vault is encrypted with a key only you hold, nobody can recover it on your behalf. Keeping your own backups is your responsibility.",
    ],
  },
  {
    number: "05",
    title: "Acceptable use",
    body: [
      "Do not use DUMP to store or distribute content that is unlawful, or to attempt to attack, overload or interfere with the application, the accounts of others, or the services it depends on.",
    ],
  },
  {
    number: "06",
    title: "No liability",
    body: [
      "To the fullest extent permitted by law, no liability is accepted for any loss of data, loss of access, or any direct, indirect or consequential damages arising from using DUMP.",
      "This includes data lost through a forgotten vault password, a change to Google's services, a defect in the application, or the application becoming unavailable.",
    ],
  },
  {
    number: "07",
    title: "The project may change",
    body: [
      "As a personal project, DUMP may change, break, or stop being maintained at any time and without notice. Because your encrypted vault lives in your own Google Drive rather than on a server belonging to DUMP, your files remain in your possession regardless.",
    ],
  },
  {
    number: "08",
    title: "Changes to these terms",
    body: [
      "These terms may be updated as the project changes. The date above reflects the most recent revision, and continuing to use DUMP means accepting the current version.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="The deal, in plain words."
      summary="A short set of terms for a personal project. The one that matters most is section 02 — if you lose your vault password, nothing can bring your memories back."
      updated="20 August 2026"
      sections={SECTIONS}
    />
  );
}
