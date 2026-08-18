const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

export function validateVaultPassword(
  password: string,
): void {
  if (
    typeof password !== "string"
  ) {
    throw new Error(
      "Vault password is invalid.",
    );
  }

  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    throw new Error(
      `Vault password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (
    password.length >
    MAX_PASSWORD_LENGTH
  ) {
    throw new Error(
      `Vault password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
}

export function isValidVaultPassword(
  password: unknown,
): password is string {
  if (
    typeof password !== "string"
  ) {
    return false;
  }

  return (
    password.length >=
      MIN_PASSWORD_LENGTH &&
    password.length <=
      MAX_PASSWORD_LENGTH
  );
}