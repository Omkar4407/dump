import "server-only";

import { auth } from "@/auth";

import {
  createAttachmentFile,
  createVaultFile,
  deleteAttachmentFile,
  downloadAttachmentFile,
  downloadVaultFile,
  findVaultFile,
  updateVaultFile,
  type DriveAttachmentFile,
  type DriveVaultFile,
} from "@/lib/google/drive";

async function getAccessToken(): Promise<string> {
  const session =
    await auth();

  const accessToken =
    session?.googleAccessToken;

  if (
    typeof accessToken !==
      "string" ||
    !accessToken
  ) {
    throw new Error(
      "Google Drive authorization is unavailable.",
    );
  }

  return accessToken;
}

export async function findUserVaultFile(): Promise<DriveVaultFile | null> {
  const accessToken =
    await getAccessToken();

  return findVaultFile(
    accessToken,
  );
}

export async function createUserVaultFile(
  encryptedVault: string,
): Promise<DriveVaultFile> {
  const accessToken =
    await getAccessToken();

  return createVaultFile(
    accessToken,
    encryptedVault,
  );
}

export async function downloadUserVaultFile(
  fileId: string,
): Promise<string> {
  const accessToken =
    await getAccessToken();

  return downloadVaultFile(
    accessToken,
    fileId,
  );
}

export async function updateUserVaultFile(
  fileId: string,
  encryptedVault: string,
): Promise<DriveVaultFile> {
  const accessToken =
    await getAccessToken();

  return updateVaultFile(
    accessToken,
    fileId,
    encryptedVault,
  );
}

export async function createUserAttachmentFile(
  encryptedContent: Blob,
  attachmentId: string,
): Promise<DriveAttachmentFile> {
  const accessToken =
    await getAccessToken();

  return createAttachmentFile(
    accessToken,
    encryptedContent,
    attachmentId,
  );
}

export async function downloadUserAttachmentFile(
  fileId: string,
) {
  const accessToken =
    await getAccessToken();

  return downloadAttachmentFile(
    accessToken,
    fileId,
  );
}

export async function deleteUserAttachmentFile(
  fileId: string,
): Promise<void> {
  const accessToken =
    await getAccessToken();

  return deleteAttachmentFile(
    accessToken,
    fileId,
  );
}