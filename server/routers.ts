import { TRPCError } from "@trpc/server";
import axios from "axios";
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
  getActiveDiscordWebhooks,
  addDiscordWebhook,
  deleteDiscordWebhook,
  createTeamInvitation,
  getInvitationByToken,
  useTeamInvitation,
  getTeamInvitations,
  deleteTeamInvitation,
  ELO_START,
  ELO_K,
  calculateEloChange,
} from "./db";
import { z } from "zod";

// ─── Staff guard (staff, ceo, admin) ─────────────────────────────────────────
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const validRoles = ["staff", "ceo", "admin"];
  if (!validRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next({ ctx });
});

// ─── CEO guard (ceo, admin) ───────────────────────────────────────────────────
const ceoProcedure = protectedProcedure.use(({ ctx, next }) => {
  const validRoles = ["ceo", "admin"];
  if (!validRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "CEO access required" });
  }
  return next({ ctx });
});

// ─── Admin guard (admin only) ─────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
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
    create: staffProcedure.input(z.object({ name: z.string() })).mutation(async ({ input, ctx }) => {
      const team = await createTeam(input.name);
      await logStaff(ctx, "CREATE_TEAM", `Created team: ${input.name}`);
      return team;
    }),
    update: staffProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), elo: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const team = await updateTeam(input.id, { name: input.name, elo: input.elo });
        await logStaff(ctx, "UPDATE_TEAM", `Updated team ${input.id}: ${JSON.stringify(input)}`);
        return team;
      }),
    delete: staffProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await deleteTeam(input.id);
      await logStaff(ctx, "DELETE_TEAM", `Deleted team ${input.id}`);
      return { success: true };
    }),
  }),

  // ─── Matches ──────────────────────────────────────────────────────────────
  matches: router({
    list: publicProcedure.query(() => getAllMatches()),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getMatchById(input.id)),
    getByTeamId: publicProcedure.input(z.object({ teamId: z.number() })).query(({ input }) => getMatchesByTeamId(input.teamId)),
    add: staffProcedure
      .input(z.object({ winnerId: z.number(), loserId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const match = await addMatch(input.winnerId, input.loserId);
        await logStaff(ctx, "ADD_MATCH", `Match: ${input.winnerId} vs ${input.loserId}, Elo change: ${match.eloChange}`);
        
        // Send Discord webhook notification
        try {
          const webhooks = await getActiveDiscordWebhooks();
          const eloChangeStr = match.eloChange > 0 ? `+${match.eloChange}` : `${match.eloChange}`;
          const message = {
            embeds: [{
              title: "🏆 New Match Result",
              description: `**${match.winnerName}** defeated **${match.loserName}**`,
              fields: [
                { name: "Winner Elo", value: `${match.winnerEloBefore} → ${match.winnerEloBefore + match.eloChange}`, inline: true },
                { name: "Loser Elo", value: `${match.loserEloBefore} → ${match.loserEloBefore - match.eloChange}`, inline: true },
                { name: "Elo Transfer", value: eloChangeStr, inline: false },
              ],
              color: 0xFFD700,
              timestamp: new Date().toISOString(),
            }]
          };
          
          for (const webhook of webhooks) {
            try {
              await axios.post(webhook.webhookUrl, message);
            } catch (err) {
              console.warn("[Discord] Failed to send webhook:", err);
            }
          }
        } catch (err) {
          console.warn("[Discord] Error sending webhooks:", err);
        }
        
        return match;
      }),
    remove: ceoProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      await removeMatch(input.id);
      await logStaff(ctx, "REMOVE_MATCH", `Removed match ${input.id}`);
      return { success: true };
    }),
  }),

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  leaderboard: router({
    byElo: publicProcedure.input(z.object({ limit: z.number().default(10) })).query(({ input }) => getLeaderboardByElo(input.limit)),
    byWins: publicProcedure.input(z.object({ limit: z.number().default(10) })).query(({ input }) => getLeaderboardByWins(input.limit)),
    byKd: publicProcedure.input(z.object({ limit: z.number().default(10) })).query(({ input }) => getLeaderboardByKd(input.limit)),
  }),

  // ─── Stats ────────────────────────────────────────────────────────────────
  stats: router({
    global: publicProcedure.query(async () => {
      const teams = await getAllTeams();
      const matches = await getAllMatches();
      return {
        totalTeams: teams.length,
        totalMatches: matches.length,
        recentMatches: matches.slice(-5),
      };
    }),
  }),

  // ─── Staff Panel ──────────────────────────────────────────────────────────
  staff: router({
    addWin: ceoProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        const updated = await updateTeam(input.teamId, { wins: team.wins + 1 });
        await logStaff(ctx, "ADD_WIN", `Team ${team.name}: +1 win`);
        return updated;
      }),
    removeWin: ceoProcedure
      .input(z.object({ teamId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        const updated = await updateTeam(input.teamId, { wins: Math.max(0, team.wins - 1) });
        await logStaff(ctx, "REMOVE_WIN", `Team ${team.name}: -1 win`);
        return updated;
      }),
    editElo: ceoProcedure
      .input(z.object({ teamId: z.number(), newElo: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        const updated = await updateTeam(input.teamId, { elo: input.newElo });
        await logStaff(ctx, "EDIT_ELO", `Team ${team.name}: ${team.elo} → ${input.newElo}`);
        return updated;
      }),
    applyPenalty: ceoProcedure
      .input(z.object({ teamId: z.number(), penaltyElo: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const team = await getTeamById(input.teamId);
        if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        const newElo = Math.max(0, team.elo - input.penaltyElo);
        const updated = await updateTeam(input.teamId, { elo: newElo });
        await logStaff(ctx, "APPLY_PENALTY", `Team ${team.name}: -${input.penaltyElo} ELO (penalty)`);
        return updated;
      }),
    logs: ceoProcedure.query(() => getStaffLogs()),
  }),

  // ─── ELO History ──────────────────────────────────────────────────────────
  eloHistory: router({
    getByTeamId: publicProcedure
      .input(z.object({ teamId: z.number() }))
      .query(({ input }) => getEloHistoryByTeamId(input.teamId)),
  }),

  // ─── Admin Panel ──────────────────────────────────────────────────────────
  admin: router({
    users: adminProcedure.query(() => getAllUsers()),
    setUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "staff", "ceo", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        const updated = await updateUserRole(input.userId, input.role);
        await logStaff(ctx, "SET_USER_ROLE", `User ${input.userId}: role → ${input.role}`);
        return updated;
      }),
  }),

  // ─── Discord Webhooks ────────────────────────────────────────────────────
  discord: router({
    webhooks: adminProcedure.query(() => getActiveDiscordWebhooks()),
    addWebhook: adminProcedure
      .input(z.object({ webhookUrl: z.string().url(), channelName: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await addDiscordWebhook(input.webhookUrl, input.channelName);
        await logStaff(ctx, "ADD_DISCORD_WEBHOOK", `Added webhook for channel: ${input.channelName || "unknown"}`);
        return { success: true };
      }),
    deleteWebhook: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteDiscordWebhook(input.id);
        await logStaff(ctx, "DELETE_DISCORD_WEBHOOK", `Deleted webhook ${input.id}`);
        return { success: true };
      }),
  }),

  // ─── API Keys ─────────────────────────────────────────────────────────────
  apiKeys: router({
    create: adminProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const key = await createApiKey(input.name, "", ctx.user.id);
        await logStaff(ctx, "CREATE_API_KEY", `Created API key: ${input.name}`);
        return key;
      }),
    list: protectedProcedure.query(({ ctx }) => getApiKeysByUser(ctx.user.id)),
    delete: adminProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteApiKeyById(input.keyId);
        await logStaff(ctx, "DELETE_API_KEY", `Deleted API key ${input.keyId}`);
        return { success: true };
      }),
  }),

  // ─── Team Invitations ────────────────────────────────────────────────────
  invitations: router({
    create: staffProcedure
      .input(z.object({ teamId: z.number(), teamName: z.string(), expiresIn: z.number().default(7) }))
      .mutation(async ({ input, ctx }) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresIn);
        const token = await createTeamInvitation(input.teamId, input.teamName, ctx.user.id, expiresAt);
        await logStaff(ctx, "CREATE_INVITATION", `Created invitation for team ${input.teamName}`);
        return { token, expiresAt };
      }),
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => getInvitationByToken(input.token)),
    getByTeam: staffProcedure
      .input(z.object({ teamId: z.number() }))
      .query(({ input }) => getTeamInvitations(input.teamId)),
    use: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const invitation = await getInvitationByToken(input.token);
        if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
        if (invitation.usedBy) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already used" });
        if (new Date() > invitation.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });
        
        await useTeamInvitation(input.token, ctx.user.id);
        await logStaff(ctx, "USE_INVITATION", `User ${ctx.user.id} joined team ${invitation.teamName}`);
        return { success: true, teamId: invitation.teamId };
      }),
    delete: staffProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTeamInvitation(input.id);
        await logStaff(ctx, "DELETE_INVITATION", `Deleted invitation ${input.id}`);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
