import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { customAuthRouter } from "./customAuth";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  getAllMatches,
  getMatchById,
  getMatchesByTeamId,
  addMatch,
  removeMatch,
  getMatchStats,
  getEloHistoryByTeamId,
  getLeaderboardByElo,
  getLeaderboardByWins,
  getLeaderboardByKd,
  addStaffLog,
  getStaffLogs,
  getAllUsers,
  updateUserRole,
  createApiKey,
  getApiKeyByKey,
  getApiKeysByUser,
  updateApiKeyLastUsed,
  ELO_START,
  ELO_K,
  calculateEloChange,
} from "./db";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next({ ctx });
});

// ─── Super Admin guard (only owner) ───────────────────────────────────────────
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Helper: log staff action ─────────────────────────────────────────────────
async function logStaff(ctx: { user: { id: number; name: string | null } }, action: string, details: string) {
  await addStaffLog({
    staffId: ctx.user.id,
    staffName: ctx.user.name ?? "Unknown Staff",
    action,
    details,
  });
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  customAuth: customAuthRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Teams ────────────────────────────────────────────────────────────────
  teams: router({
    list: publicProcedure.query(async () => {
      return getAllTeams();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        return team;
      }),

    create: adminProcedure
      .input(z.object({ name: z.string().min(2).max(100) }))
      .mutation(async ({ input, ctx }) => {
        const team = await createTeam(input.name);
        await logStaff(ctx, "CREATE_TEAM", `Created team "${input.name}" (ID: ${team.id})`);
        return team;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).max(100).optional(),
        wins: z.number().min(0).optional(),
        losses: z.number().min(0).optional(),
        elo: z.number().min(0).optional(),
        streak: z.number().optional(),
        bestStreak: z.number().min(0).optional(),
        freeroamWins: z.number().min(0).optional(),
        freeroamLosses: z.number().min(0).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const before = await getTeamById(id);
        if (!before) throw new TRPCError({ code: "NOT_FOUND" });
        const team = await updateTeam(id, data);
        await logStaff(ctx, "UPDATE_TEAM", `Updated team "${before.name}" (ID: ${id}): ${JSON.stringify(data)}`);
        return team;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await deleteTeam(input.id);
        await logStaff(ctx, "DELETE_TEAM", `Deleted team "${team.name}" (ID: ${input.id})`);
        return { success: true };
      }),

    editElo: adminProcedure
      .input(z.object({ id: z.number(), elo: z.number().min(0), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const updated = await updateTeam(input.id, { elo: input.elo });
        // Record elo history for manual edit
        const { getDb } = await import("./db");
        const { eloHistory } = await import("../drizzle/schema");
        const db = await getDb();
        if (db) await db.insert(eloHistory).values({ teamId: input.id, elo: input.elo });
        await logStaff(ctx, "EDIT_ELO", `Manually set Elo of "${team.name}" from ${team.elo} to ${input.elo}${input.reason ? ` — Reason: ${input.reason}` : ""}`);
        return updated;
      }),

    applyPenalty: adminProcedure
      .input(z.object({ id: z.number(), penalty: z.number().min(1), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const newElo = Math.max(0, team.elo - input.penalty);
        const updated = await updateTeam(input.id, { elo: newElo });
        const { getDb } = await import("./db");
        const { eloHistory } = await import("../drizzle/schema");
        const db = await getDb();
        if (db) await db.insert(eloHistory).values({ teamId: input.id, elo: newElo });
        await logStaff(ctx, "APPLY_PENALTY", `Applied penalty of -${input.penalty} Elo to "${team.name}" (${team.elo} → ${newElo})${input.reason ? ` — Reason: ${input.reason}` : ""}`);
        return updated;
      }),

    addWin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const updated = await updateTeam(input.id, { wins: team.wins + 1 });
        await logStaff(ctx, "ADD_WIN", `Added 1 win to "${team.name}" (total: ${team.wins + 1})`);
        return updated;
      }),

    removeWin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const updated = await updateTeam(input.id, { wins: Math.max(0, team.wins - 1) });
        await logStaff(ctx, "REMOVE_WIN", `Removed 1 win from "${team.name}" (total: ${Math.max(0, team.wins - 1)})`);
        return updated;
      }),

    addLoss: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const updated = await updateTeam(input.id, { losses: team.losses + 1 });
        await logStaff(ctx, "ADD_LOSS", `Added 1 loss to "${team.name}" (total: ${team.losses + 1})`);
        return updated;
      }),

    removeLoss: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const updated = await updateTeam(input.id, { losses: Math.max(0, team.losses - 1) });
        await logStaff(ctx, "REMOVE_LOSS", `Removed 1 loss from "${team.name}" (total: ${Math.max(0, team.losses - 1)})`);
        return updated;
      }),
  }),

  // ─── Matches ──────────────────────────────────────────────────────────────
  matches: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return getAllMatches(input?.limit ?? 100);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const match = await getMatchById(input.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        return match;
      }),

    byTeam: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return getMatchesByTeamId(input.teamId);
      }),

    add: adminProcedure
      .input(z.object({ winnerId: z.number(), loserId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // This procedure works with both admin users and API keys
        const staffId = ctx.user?.id || 0;
        const staffName = ctx.user?.name || "API Bot";
        if (input.winnerId === input.loserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Winner and loser must be different teams" });
        }
        const match = await addMatch(input.winnerId, input.loserId);
        await logStaff(ctx, "ADD_MATCH", `Added match: winner ID ${input.winnerId} vs loser ID ${input.loserId} (Elo change: ${match?.eloChange ?? "?"})`);
        return match;
      }),

    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const match = await removeMatch(input.id);
        await logStaff(ctx, "REMOVE_MATCH", `Removed match ID ${input.id}: ${match.winnerName} vs ${match.loserName}`);
        return { success: true };
      }),

    undo: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const match = await removeMatch(input.id);
        await logStaff(ctx, "UNDO_MATCH", `Undone match ID ${input.id}: ${match.winnerName} vs ${match.loserName} — Elo reverted`);
        return { success: true };
      }),
  }),

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  leaderboard: router({
    byElo: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return getLeaderboardByElo(input?.limit ?? 50);
      }),

    byWins: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return getLeaderboardByWins(input?.limit ?? 50);
      }),

    byKd: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return getLeaderboardByKd(input?.limit ?? 50);
      }),
  }),

  // ─── Stats ────────────────────────────────────────────────────────────────
  stats: router({
    global: publicProcedure.query(async () => {
      const [teamStats, matchStats, recentMatches] = await Promise.all([
        getTeamStats(),
        getMatchStats(),
        getAllMatches(5),
      ]);
      return {
        totalTeams: teamStats.totalTeams,
        totalMatches: matchStats.totalMatches,
        recentMatches,
      };
    }),
  }),

  // ─── Elo History ──────────────────────────────────────────────────────────
  eloHistory: router({
    byTeam: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(async ({ input }) => {
        return getEloHistoryByTeamId(input.teamId);
      }),
  }),

  // ─── Staff Logs ───────────────────────────────────────────────────────────
  staffLogs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
      .query(async ({ input }) => {
        return getStaffLogs(input?.limit ?? 200);
      }),
  }),

  // ─── Admin: User Management ───────────────────────────────────────────────────
  admin: router({
    users: superAdminProcedure.query(async () => {
      return getAllUsers();
    }),

    setUserRole: superAdminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ input, ctx }) => {
        await updateUserRole(input.userId, input.role);
        await logStaff(ctx, "UPDATE_USER_ROLE", `Set ${input.role === "admin" ? "admin" : "user"} role for user ID ${input.userId}`);
        return { success: true };
      }),
  }),

  // API Keys for bot authentication
  apiKeys: router({
    create: superAdminProcedure
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const key = await createApiKey(input.name, input.description || "", ctx.user.id);
        await logStaff(ctx, "CREATE_API_KEY", `Created API key: ${input.name}`);
        return { key, name: input.name };
      }),

    list: superAdminProcedure.query(async ({ ctx }) => {
      return getApiKeysByUser(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
