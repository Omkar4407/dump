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
    readonly id: string;
    readonly key: CryptoKey;
    readonly salt: Uint8Array;
  };
  
  let activeSession:
    | VaultSession
    | null = null;
  
  function decodeSalt(
    encodedSalt: string,
  ): Uint8Array {
    if (
      typeof encodedSalt !==
        "string" ||
      encodedSalt.length === 0
    ) {
      throw new Error(
        "Vault encryption metadata is invalid.",
      );
    }
  
    let binary: string;
  
    try {
      binary =
        atob(encodedSalt);
    } catch {
      throw new Error(
        "Vault encryption metadata is invalid.",
      );
    }
  
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
  }
  
  
  function createSessionId(): string {
    return crypto.randomUUID();
  }
  
  function createSession(
    key: CryptoKey,
    salt: Uint8Array,
  ): VaultSession {
    return {
      id: createSessionId(),
      key,
      salt: new Uint8Array(
        salt,
      ),
    };
  }
  
  export async function createVaultSession(
    password: string,
  ): Promise<VaultSession> {
    validateVaultPassword(
      password,
    );
  
    /*
     * Always invalidate any previous
     * session before creating a new one.
     */
    clearVaultSession();
  
    try {
      const salt =
        generateVaultSalt();
  
      const key =
        await deriveVaultKey(
          password,
          salt,
        );
  
      const session =
        createSession(
          key,
          salt,
        );
  
      activeSession =
        session;
  
      return session;
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
  
    /*
     * Never allow an old session to
     * survive a new unlock attempt.
     */
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
  
      let decrypted: unknown;
  
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
  
      /*
       * Only create the active session
       * after BOTH cryptographic
       * verification and vault schema
       * validation succeed.
       */
      activeSession =
        createSession(
          key,
          salt,
        );
  
      return vault;
    } catch (error) {
      clearVaultSession();
      throw error;
    }
  }
  
  export async function encryptVaultSession(
    vault: Vault,
  ): Promise<EncryptedVault> {
    const session =
      requireVaultSession();
  
    const validatedVault =
      validateAndMigrateVault(
        vault,
      );
  
    /*
     * encryptVaultWithKey() will use the
     * session's salt. Keeping this value
     * attached to the session guarantees
     * that all subsequent vault writes
     * use the same salt that derived the
     * active key.
     */
    return encryptVaultWithKey(
      session.key,
      session.salt,
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
     * CryptoKey is non-exportable, so
     * JavaScript cannot explicitly zeroize
     * it. Removing the application's
     * reference makes it eligible for
     * garbage collection.
     *
     * Replacing the entire session object
     * also invalidates its session ID and
     * prevents later code from treating
     * the old session as active.
     */
    activeSession = null;
  }
  
  export function createNewVault():
    Vault {
    return createEmptyVault();
  }