import {
    decryptVaultWithKey,
    deriveVaultKey,
    encryptVaultWithKey,
    generateVaultSalt,
    type EncryptedVault,
  } from "@/lib/crypto/vault";
  
  import type {
    Vault,
  } from "@/types/memory";
  
  import {
    createEmptyVault,
  } from "@/lib/vault/vault";
  
  import {
    validateAndMigrateVault,
  } from "@/lib/vault/schema";
  
  import {
    validateVaultPassword,
  } from "@/lib/security/password";
  
  type VaultSession = {
    key: CryptoKey;
    salt: Uint8Array;
  };
  
  let activeSession:
    | VaultSession
    | null = null;
  
  function decodeSalt(
    encodedSalt: string,
  ): Uint8Array {
    try {
      const binary =
        atob(encodedSalt);
  
      const bytes =
        new Uint8Array(
          binary.length,
        );
  
      for (
        let index = 0;
        index <
        binary.length;
        index++
      ) {
        bytes[index] =
          binary.charCodeAt(
            index,
          );
      }
  
      return bytes;
    } catch {
      throw new Error(
        "Vault encryption metadata is invalid.",
      );
    }
  }
  
  export async function createVaultSession(
    password: string,
  ): Promise<VaultSession> {
    validateVaultPassword(
      password,
    );
  
    clearVaultSession();
  
    try {
      const salt =
        generateVaultSalt();
  
      const key =
        await deriveVaultKey(
          password,
          salt,
        );
  
      activeSession = {
        key,
        salt: new Uint8Array(
          salt,
        ),
      };
  
      return activeSession;
    } catch (error) {
      clearVaultSession();
      throw error;
    }
  }
  
  export async function unlockVaultSession(
    password: string,
    encryptedVault: EncryptedVault,
  ): Promise<Vault> {
    validateVaultPassword(
      password,
    );
  
    clearVaultSession();
  
    try {
      if (
        encryptedVault.version !==
        1
      ) {
        throw new Error(
          "Unsupported vault encryption version.",
        );
      }
  
      const salt =
        decodeSalt(
          encryptedVault.salt,
        );
  
      const key =
        await deriveVaultKey(
          password,
          salt,
        );
  
      let decrypted:
        unknown;
  
      try {
        decrypted =
          await decryptVaultWithKey<unknown>(
            key,
            encryptedVault,
          );
      } catch {
        throw new Error(
          "Unable to decrypt the vault. The password or vault data may be invalid.",
        );
      }
  
      const vault =
        validateAndMigrateVault(
          decrypted,
        );
  
      activeSession = {
        key,
        salt: new Uint8Array(
          salt,
        ),
      };
  
      return vault;
    } catch (error) {
      clearVaultSession();
      throw error;
    }
  }
  
  export async function encryptVaultSession(
    vault: Vault,
  ): Promise<EncryptedVault> {
    if (!activeSession) {
      throw new Error(
        "No active vault session.",
      );
    }
  
    const validatedVault =
      validateAndMigrateVault(
        vault,
      );
  
    return encryptVaultWithKey(
      activeSession.key,
      activeSession.salt,
      validatedVault,
    );
  }
  
  export function getVaultSession():
    VaultSession | null {
    return activeSession;
  }
  
  export function hasVaultSession():
    boolean {
    return activeSession !== null;
  }
  
  export function requireVaultSession():
    VaultSession {
    if (!activeSession) {
      throw new Error(
        "No active vault session.",
      );
    }
  
    return activeSession;
  }
  
  export function clearVaultSession():
    void {
    /*
     * JavaScript cannot explicitly destroy a
     * non-exportable CryptoKey. Removing the
     * application's reference is the correct
     * lifecycle operation.
     */
    activeSession = null;
  }
  
  export function createNewVault():
    Vault {
    return createEmptyVault();
  }