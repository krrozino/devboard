import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { githubAppConfigurations } from "@/db/schema";
import { decryptCredential } from "@/modules/github/credentials";

export const runtime = "nodejs";

function validSignature(body: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");
  const authSecret = process.env.AUTH_SECRET;

  if (!signature || !deliveryId || !event || !authSecret) {
    return NextResponse.json({ error: "invalid webhook request" }, { status: 400 });
  }

  const [app] = await db.select().from(githubAppConfigurations).limit(1);
  if (!app) {
    return NextResponse.json({ error: "github app not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const webhookSecret = decryptCredential(app.webhookSecretEncrypted, authSecret);
  if (!validSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  console.info("github_webhook_received", { deliveryId, event });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
