import "server-only";

import {
  findVaultFile,
  createVaultFile,
  downloadVaultFile,
  updateVaultFile,
  type DriveVaultFile,
} from "@/lib/google/drive";

import {
  getGoogleDriveAccessToken,
} from "@/lib/google/google-token";

export async function findUserVaultFile(): Promise<DriveVaultFile | null> {
  const accessToken =
    await getGoogleDriveAccessToken();

  return findVaultFile(
    accessToken,
  );
}

export async function createUserVaultFile(
  encryptedVault: string,
): Promise<DriveVaultFile> {
  const accessToken =
    await getGoogleDriveAccessToken();

  return createVaultFile(
    accessToken,
    encryptedVault,
  );
}

export async function downloadUserVaultFile(
  fileId: string,
): Promise<string> {
  const accessToken =
    await getGoogleDriveAccessToken();

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
    await getGoogleDriveAccessToken();

  return updateVaultFile(
    accessToken,
    fileId,
    encryptedVault,
  );
}