import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// API Key authentication middleware for bot
export const apiKeyProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const apiKey = ctx.req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "API key required" });
    }

    const { getApiKeyByKey, updateApiKeyLastUsed } = await import("../db");
    const keyRecord = await getApiKeyByKey(apiKey);

    if (!keyRecord || !keyRecord.isActive) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or inactive API key" });
    }

    await updateApiKeyLastUsed(keyRecord.id);

    return next({
      ctx: {
        ...ctx,
        apiKey: keyRecord,
      },
    });
  }),
);
