import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUMP",
  description: "Store First. Organize Never. Retrieve Naturally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}