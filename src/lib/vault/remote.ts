import type { EncryptedVault } from "@/lib/crypto/vault";

type VaultResponse =
  | {
      exists: false;
    }
  | {
      exists: true;
      vault: EncryptedVault;
    };

async function parseResponse(
  response: Response,
) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "Vault request failed.",
    );
  }

  return data;
}

export async function loadRemoteVault(): Promise<VaultResponse> {
  const response = await fetch(
    "/api/vault",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  return parseResponse(
    response,
  );
}

export async function createRemoteVault(
  vault: EncryptedVault,
) {
  const response = await fetch(
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

  return parseResponse(
    response,
  );
}

export async function updateRemoteVault(
  vault: EncryptedVault,
) {
  const response = await fetch(
    "/api/vault",
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        vault,
      }),
    },
  );

  return parseResponse(
    response,
  );
}