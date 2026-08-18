import type { EncryptedVault } from "@/lib/crypto/vault";

export type SaveResult = {
  fileId: string;
  vault: EncryptedVault;
};

export type SaveFunction = (
  vault: EncryptedVault,
) => Promise<SaveResult>;

export class VaultSaveQueue {
  private running = false;

  private latest:
    | {
        vault: EncryptedVault;
        resolve: (
          result: SaveResult,
        ) => void;
        reject: (
          error: unknown,
        ) => void;
      }
    | null = null;

  constructor(
    private readonly saveFunction: SaveFunction,
  ) {}

  async save(
    vault: EncryptedVault,
  ): Promise<SaveResult> {
    if (!this.running) {
      return this.run(
        vault,
      );
    }

    return new Promise(
      (
        resolve,
        reject,
      ) => {
        /*
         * Only the latest unsaved complete
         * vault matters.
         */
        this.latest = {
          vault,
          resolve,
          reject,
        };
      },
    );
  }

  private async run(
    vault: EncryptedVault,
  ): Promise<SaveResult> {
    this.running = true;

    try {
      const result =
        await this.saveFunction(
          vault,
        );

      /*
       * If another mutation happened while
       * this save was in flight, immediately
       * persist the latest complete vault.
       */
      if (this.latest) {
        const next =
          this.latest;

        this.latest = null;

        try {
          const nextResult =
            await this.run(
              next.vault,
            );

          next.resolve(
            nextResult,
          );

          return nextResult;
        } catch (error) {
          next.reject(error);
          throw error;
        }
      }

      return result;
    } finally {
      this.running = false;
    }
  }

  isSaving(): boolean {
    return this.running;
  }

  clear(): void {
    /*
     * We intentionally don't reject pending
     * saves here because Lock Vault is a local
     * lifecycle operation. Any in-flight network
     * request will finish independently.
     */
    this.latest = null;
  }
}