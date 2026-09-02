import { NextRequest, NextResponse } from "next/server";
import { isLocale, localeCookieName } from "@/modules/i18n";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const locale = formData.get("locale");
  const returnToValue = formData.get("returnTo");
  const returnTo =
    typeof returnToValue === "string" && returnToValue.startsWith("/") && !returnToValue.startsWith("//")
      ? returnToValue
      : "/";

  if (!isLocale(locale)) {
    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(localeCookieName, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
