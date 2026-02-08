import type { VercelRequest, VercelResponse } from "@vercel/node";
import { COOKIE_NAME } from "../../shared/const.js";
import { sdk } from "../../server/_core/sdk.js";
import { verifyClerkSession, getOrCreateUserFromClerk } from "../../server/_core/clerk.js";
import { getDb } from "../../server/db.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use Clerk as the single source of truth for authentication
    const clerkUser = await verifyClerkSession(req);
    if (clerkUser) {
      const db = await getDb();
      if (db) {
        const dbUser = await getOrCreateUserFromClerk(clerkUser, db, users, eq);
        return res.json({
          user: {
            id: (dbUser as any).id,
            clerkId: (dbUser as any).clerkId || clerkUser.user.id,
            openId: (dbUser as any).openId, // Keep for backwards compatibility if needed
            name: (dbUser as any).name,
            email: (dbUser as any).email,
            loginMethod: "clerk",
            lastSignedIn: ((dbUser as any).lastSignedIn ?? new Date()).toISOString(),
            subscriptionPlan: (dbUser as any).subscriptionPlan,
            subscriptionStatus: (dbUser as any).subscriptionStatus,
          }
        });
      }
    }

    // If Clerk auth fails, return not authenticated
    return res.status(401).json({ error: "Not authenticated", user: null });

  } catch (error) {
    console.error("[Auth] /api/auth/me failed:", error);
    return res.status(401).json({ error: "Not authenticated", user: null });
  }
}
