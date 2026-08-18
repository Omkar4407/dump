import type { EncryptedVault } from "@/lib/crypto/vault";

export type VaultResponse =
  | {
      exists: false;
    }
  | {
      exists: true;
      fileId: string;
      vault: EncryptedVault;
    };

export type VaultMutationResponse = {
  success: true;
  fileId: string;
};

export class VaultFileNotFoundError
  extends Error {
  constructor() {
    super(
      "DUMP vault file was not found.",
    );

    this.name =
      "VaultFileNotFoundError";
  }
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Vault server returned an invalid response.",
    );
  }

  if (!response.ok) {
    if (
      response.status === 404
    ) {
      throw new VaultFileNotFoundError();
    }

    const error =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (
        data as {
          error?: unknown;
        }
      ).error === "string"
        ? (
            data as {
              error: string;
            }
          ).error
        : "Vault request failed.";

    throw new Error(error);
  }

  return data as T;
}

export async function loadRemoteVault(): Promise<VaultResponse> {
  const response =
    await fetch(
      "/api/vault",
      {
        method: "GET",
        cache: "no-store",
      },
    );

  return parseResponse<VaultResponse>(
    response,
  );
}

export async function createRemoteVault(
  vault: EncryptedVault,
): Promise<VaultMutationResponse> {
  const response =
    await fetch(
      "/api/vault",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          vault,
        }),
      },
    );

  return parseResponse<VaultMutationResponse>(
    response,
  );
}

export async function updateRemoteVault(
  fileId: string,
  vault: EncryptedVault,
): Promise<VaultMutationResponse> {
  const response =
    await fetch(
      "/api/vault",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          fileId,
          vault,
        }),
      },
    );

  return parseResponse<VaultMutationResponse>(
    response,
  );
}