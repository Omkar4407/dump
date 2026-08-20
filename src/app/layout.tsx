import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DUMP — Private Memory Vault",
  description: "Store First. Organize Never. Retrieve Naturally.",
};

export const viewport: Viewport = {
  themeColor: "#FFF7EC",
  /*
   * The shell is exactly one viewport tall,
   * so the browser must not zoom-scroll it.
   */
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
