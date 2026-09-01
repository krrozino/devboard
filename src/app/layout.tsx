import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevBoard",
  description: "GitHub tracks the work. DevBoard tells you how it's going.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
