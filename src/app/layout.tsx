import type { Metadata } from "next";
import { HelpDock } from "@/components/help-dock";
import { getLocale } from "@/modules/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevBoard",
  description: "GitHub tracks the work. DevBoard tells you how it's going.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        {children}
        <HelpDock locale={locale} />
      </body>
    </html>
  );
}
