import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions } from "./_core/cookies";
import { ONE_YEAR_MS } from "@shared/const";
import {
  getUserByEmail,
  getUserByUsername,
  getUserById,
  createCustomUser,
  createAuthSession,
  getAuthSession,
  deleteAuthSession,
  updateUserLastSignedIn,
} from "./db";

// Cookie name for the custom auth session (separate from Manus OAuth cookie)
export const CUSTOM_COOKIE_NAME = "ft_session";

function genToken() {
  return randomBytes(32).toString("hex");
}

function genOpenId() {
  return "local_" + randomBytes(16).toString("hex");
}

const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

export const customAuthRouter = router({
  // Get current user from custom session cookie
  me: publicProcedure.query(async ({ ctx }) => {
    const cookies = ctx.req.headers.cookie || "";
    const match = cookies.split(";").map(c => c.trim()).find(c => c.startsWith(CUSTOM_COOKIE_NAME + "="));
    if (!match) return null;
    const token = decodeURIComponent(match.split("=")[1] || "");
    if (!token) return null;
    const session = await getAuthSession(token);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await deleteAuthSession(token);
      return null;
    }
    const user = await getUserById(session.userId);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }),

  register: publicProcedure
    .input(
      z.object({
        username: z.string().regex(usernameRegex, "Username: 3-30 caratteri, solo lettere, numeri e underscore"),
        email: z.string().email("Email non valida"),
        password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingEmail = await getUserByEmail(input.email);
      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "Email già registrata" });
      }
      const existingUsername = await getUserByUsername(input.username);
      if (existingUsername) {
        throw new TRPCError({ code: "CONFLICT", message: "Username già in uso" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await createCustomUser({
        openId: genOpenId(),
        username: input.username,
        email: input.email,
        passwordHash,
        name: input.username,
        role: "user",
      });

      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Errore nella creazione dell'account" });
      }

      // Create session
      const token = genToken();
      const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
      await createAuthSession(token, user.id, expiresAt);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(CUSTOM_COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        identifier: z.string().min(1, "Inserisci email o username"),
        password: z.string().min(1, "Inserisci la password"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // identifier can be email or username
      let user = input.identifier.includes("@")
        ? await getUserByEmail(input.identifier)
        : await getUserByUsername(input.identifier);

      // fallback: try the other lookup
      if (!user) {
        user = await getUserByUsername(input.identifier);
      }

      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenziali non valide" });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenziali non valide" });
      }

      const token = genToken();
      const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
      await createAuthSession(token, user.id, expiresAt);
      await updateUserLastSignedIn(user.id);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(CUSTOM_COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookies = ctx.req.headers.cookie || "";
    const match = cookies.split(";").map(c => c.trim()).find(c => c.startsWith(CUSTOM_COOKIE_NAME + "="));
    if (match) {
      const token = decodeURIComponent(match.split("=")[1] || "");
      if (token) await deleteAuthSession(token);
    }
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(CUSTOM_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});
