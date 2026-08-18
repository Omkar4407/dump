import "server-only";

type RefreshTokenResult = {
  access_token: string;
  expires_in?: number;
};

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<RefreshTokenResult> {
  const clientId =
    process.env.AUTH_GOOGLE_ID;

  const clientSecret =
    process.env.AUTH_GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials are not configured.",
    );
  }

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Google token refresh failed:",
      response.status,
      errorText,
    );

    throw new Error(
      "Unable to refresh Google access token.",
    );
  }

  const data =
    (await response.json()) as RefreshTokenResult;

  if (!data.access_token) {
    throw new Error(
      "Google did not return a new access token.",
    );
  }

  return data;
}