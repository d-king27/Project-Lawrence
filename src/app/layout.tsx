import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Lawrence",
  description: "A rules-grounded Warhammer assistant.",
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
