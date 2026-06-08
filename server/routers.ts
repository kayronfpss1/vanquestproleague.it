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
  deleteApiKeyById,
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
    list: publicProcedure.query(() => getAllTeams()),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getTeamById(input.id)),
    create: adminProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const team = await createTeam(input.name);
        await logStaff(ctx, "CREATE_TEAM", `Created team: ${input.name}`);
        return team;
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await updateTeam(input.id, { name: input.name });
        await logStaff(ctx, "UPDATE_TEAM", `Updated team: ${input.name}`);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await deleteTeam(input.id);
        await logStaff(ctx, "DELETE_TEAM", `Deleted team: ${team.name}`);
        return { success: true };
      }),
    addWin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.id, { wins: team.wins + 1 });
        await logStaff(ctx, "ADD_WIN", `Added win to ${team.name}`);
        return { success: true };
      }),
    removeWin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.id, { wins: Math.max(0, team.wins - 1) });
        await logStaff(ctx, "REMOVE_WIN", `Removed win from ${team.name}`);
        return { success: true };
      }),
    editElo: adminProcedure
      .input(z.object({ id: z.number(), elo: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const oldElo = team.elo;
        await updateTeam(input.id, { elo: input.elo });
        await logStaff(ctx, "EDIT_ELO", `Changed ${team.name} Elo from ${oldElo} to ${input.elo}${input.reason ? ` (${input.reason})` : ""}`);
        return { success: true };
      }),
    applyPenalty: adminProcedure
      .input(z.object({ id: z.number(), penalty: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.id);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const newElo = Math.max(ELO_START, team.elo - input.penalty);
        await updateTeam(input.id, { elo: newElo });
        await logStaff(ctx, "APPLY_PENALTY", `Applied ${input.penalty} Elo penalty to ${team.name}${input.reason ? ` (${input.reason})` : ""}`);
        return { success: true };
      }),
  }),

  // ─── Matches ──────────────────────────────────────────────────────────────
  matches: router({
    list: publicProcedure.query(() => getAllMatches()),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getMatchById(input.id)),
    getByTeamId: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(({ input }) => getMatchesByTeamId(input.teamId)),
    add: adminProcedure
      .input(z.object({ winnerId: z.number(), loserId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const winner = await getTeamById(input.winnerId);
        const loser = await getTeamById(input.loserId);
        if (!winner || !loser) throw new TRPCError({ code: "NOT_FOUND" });
        const eloChange = calculateEloChange(winner.elo, loser.elo);
        const match = await addMatch(input.winnerId, input.loserId);
        await logStaff(ctx, "ADD_MATCH", `${winner.name} beat ${loser.name} (+${eloChange} Elo)`);
        return match;
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const match = await getMatchById(input.id);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const winner = await getTeamById(match.winnerId);
        const loser = await getTeamById(match.loserId);
        await removeMatch(input.id);
        await logStaff(ctx, "REMOVE_MATCH", `Removed match: ${winner?.name || "Unknown"} vs ${loser?.name || "Unknown"}`);
        return { success: true };
      }),
  }),

  // ─── Elo History ─────────────────────────────────────────────────────────────
  eloHistory: router({
    getByTeamId: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(({ input }) => getEloHistoryByTeamId(input.teamId)),
  }),

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  leaderboard: router({
    byElo: publicProcedure.query(() => getLeaderboardByElo()),
    byWins: publicProcedure.query(() => getLeaderboardByWins()),
    byKd: publicProcedure.query(() => getLeaderboardByKd()),
  }),

  // ─── Stats ────────────────────────────────────────────────────────────────
  stats: router({
    global: publicProcedure.query(async () => {
      const teams = await getAllTeams();
      const matches = await getAllMatches();
      return {
        totalTeams: teams.length,
        totalMatches: matches.length,
        recentMatches: matches.slice(0, 5),
      };
    }),
  }),

  // ─── Staff Management ──────────────────────────────────────────────────────
  staff: router({
    addWin: adminProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.teamId, { wins: team.wins + 1 });
        await logStaff(ctx, "ADD_WIN", `Added win to ${team.name}`);
        return { success: true };
      }),
    removeWin: adminProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team || team.wins === 0) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.teamId, { wins: team.wins - 1 });
        await logStaff(ctx, "REMOVE_WIN", `Removed win from ${team.name}`);
        return { success: true };
      }),
    addLoss: adminProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.teamId, { losses: team.losses + 1 });
        await logStaff(ctx, "ADD_LOSS", `Added loss to ${team.name}`);
        return { success: true };
      }),
    removeLoss: adminProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team || team.losses === 0) throw new TRPCError({ code: "NOT_FOUND" });
        await updateTeam(input.teamId, { losses: team.losses - 1 });
        await logStaff(ctx, "REMOVE_LOSS", `Removed loss from ${team.name}`);
        return { success: true };
      }),
    editElo: adminProcedure
      .input(z.object({ teamId: z.number(), newElo: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const oldElo = team.elo;
        await updateTeam(input.teamId, { elo: input.newElo });
        await logStaff(ctx, "EDIT_ELO", `Changed ${team.name} Elo from ${oldElo} to ${input.newElo}`);
        return { success: true };
      }),
    applyPenalty: adminProcedure
      .input(z.object({ teamId: z.number(), penalty: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND" });
        const newElo = Math.max(ELO_START, team.elo - input.penalty);
        await updateTeam(input.teamId, { elo: newElo });
        await logStaff(ctx, "APPLY_PENALTY", `Applied ${input.penalty} Elo penalty to ${team.name}`);
        return { success: true };
      }),
  }),

  // ─── Staff Logs ───────────────────────────────────────────────────────────────
  staffLogs: router({
    list: adminProcedure.query(() => getStaffLogs()),
  }),

  // ─── Admin Management ──────────────────────────────────────────────────────
  admin: router({
    users: superAdminProcedure.query(() => getAllUsers()),
    setUserRole: superAdminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
      .mutation(async ({ input, ctx }) => {
        await updateUserRole(input.userId, input.role);
        const roleText = input.role === "admin" ? "promoted to ADMIN" : "demoted to USER";
        await logStaff(ctx, "SET_USER_ROLE", `User ${input.userId} ${roleText}`);
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

    delete: superAdminProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const keys = await getApiKeysByUser(ctx.user.id);
        const keyExists = keys.find((k: any) => k.id === input.keyId);
        if (!keyExists) {
          throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
        }
        await deleteApiKeyById(input.keyId);
        await logStaff(ctx, "DELETE_API_KEY", `Deleted API key: ${keyExists.name}`);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
