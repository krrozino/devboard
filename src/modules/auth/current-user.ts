import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) return null;

  const session = verifySessionToken(token, secret);
  if (!session) return null;

  const [user] = await db
    .select({
      id: users.id,
      githubId: users.githubId,
      username: users.username,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.sub))
    .limit(1);

  return user ?? null;
}
