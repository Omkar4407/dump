import "server-only";

import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

import { refreshGoogleAccessToken } from "@/lib/google/refresh-token";

type GoogleToken = {
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleAccessTokenExpiresAt?: number;
};

async function getAuthToken(): Promise<GoogleToken> {
  const cookieStore = await cookies();

  const cookieNames = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];

  let sessionToken: string | undefined;

  for (const name of cookieNames) {
    const value = cookieStore.get(name)?.value;

    if (value) {
      sessionToken = value;
      break;
    }
  }

  if (!sessionToken) {
    throw new Error(
      "Authentication session not found.",
    );
  }

  const secret =
    process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not configured.",
    );
  }

  const token = await decode({
    token: sessionToken,
    secret,
    salt: cookieNames.find((name) =>
      cookieStore.has(name),
    ) ?? "authjs.session-token",
  });

  if (!token) {
    throw new Error(
      "Unable to decode authentication session.",
    );
  }

  return token as GoogleToken;
}

export async function getGoogleDriveAccessToken(): Promise<string> {
  const token =
    await getAuthToken();

  if (
    token.googleAccessToken &&
    token.googleAccessTokenExpiresAt
  ) {
    const isStillValid =
      Date.now() <
      token.googleAccessTokenExpiresAt -
        60_000;

    if (isStillValid) {
      return token.googleAccessToken;
    }
  }

  if (
    !token.googleRefreshToken
  ) {
    throw new Error(
      "Google Drive authorization is unavailable. Please sign in again.",
    );
  }

  const refreshed =
    await refreshGoogleAccessToken(
      token.googleRefreshToken,
    );

  return refreshed.access_token;
}