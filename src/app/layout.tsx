import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Servo Skull",
  description: "A rules-grounded Warhammer assistant.",
  icons: {
    icon: "/favicon.svg",
  },
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
