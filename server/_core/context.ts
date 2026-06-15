import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { CUSTOM_COOKIE_NAME } from "../customAuth";
import { getAuthSession, getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First try custom local auth (username/password)
  try {
    const cookies = opts.req.headers.cookie || "";
    const match = cookies.split(";").map(c => c.trim()).find(c => c.startsWith(CUSTOM_COOKIE_NAME + "="));
    if (match) {
      const token = decodeURIComponent(match.split("=")[1] || "");
      if (token) {
        const session = await getAuthSession(token);
        if (session && new Date(session.expiresAt).getTime() > Date.now()) {
          const foundUser = await getUserById(session.userId);
          if (foundUser) user = foundUser;
        }
      }
    }
  } catch (error) {
    // Custom auth failed, continue to Manus auth
  }

  // Fallback to Manus OAuth if no local session
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
