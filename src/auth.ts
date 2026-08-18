import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { refreshGoogleAccessToken } from "@/lib/google/refresh-token";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID,

      clientSecret:
        process.env.AUTH_GOOGLE_SECRET,

      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",

          access_type:
            "offline",

          prompt: "consent",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      account,
    }) {
      /*
       * First Google sign-in.
       */
      if (
        account?.provider ===
        "google"
      ) {
        token.googleAccessToken =
          account.access_token;

        token.googleRefreshToken =
          account.refresh_token;

        token.googleAccessTokenExpiresAt =
          account.expires_at
            ? account.expires_at *
              1000
            : undefined;

        return token;
      }

      /*
       * No Google access token means
       * there is nothing to refresh.
       */
      if (
        !token.googleAccessToken
      ) {
        return token;
      }

      /*
       * If expiry information is missing,
       * keep the existing token for now.
       */
      if (
        !token.googleAccessTokenExpiresAt
      ) {
        return token;
      }

      /*
       * Give ourselves a 60-second buffer
       * before the actual expiry.
       */
      const isStillValid =
        Date.now() <
        token.googleAccessTokenExpiresAt -
          60_000;

      if (isStillValid) {
        return token;
      }

      /*
       * Access token has expired or is
       * about to expire.
       */
      if (
        !token.googleRefreshToken
      ) {
        console.error(
          "Google refresh token is missing.",
        );

        token.googleTokenError =
          "RefreshTokenMissing";

        return token;
      }

      try {
        const refreshed =
          await refreshGoogleAccessToken(
            token.googleRefreshToken,
          );

        token.googleAccessToken =
          refreshed.access_token;

        token.googleAccessTokenExpiresAt =
          Date.now() +
          (refreshed.expires_in ??
            3600) *
            1000;

        /*
         * Google may not return a new
         * refresh token during refresh.
         *
         * Keep the existing refresh token.
         */

        delete token.googleTokenError;

        return token;
      } catch {
        console.error(
          "Unable to refresh Google access token.",
        );

        token.googleTokenError =
          "RefreshAccessTokenError";

        return token;
      }
    },

    async session({
      session,
      token,
    }) {
      /*
       * Expose the Google access token to
       * server-side authenticated helpers.
       *
       * This does NOT make the token available
       * to unauthenticated requests.
       */
      session.googleAccessToken =
        token.googleAccessToken;

      session.googleTokenError =
        token.googleTokenError;

      return session;
    },
  },
});