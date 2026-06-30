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
  updateTeamLogo,
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
    updateLogo: staffProcedure
      .input(z.object({ id: z.number(), logoUrl: z.string().url() }))
      .mutation(async ({ input, ctx }) => {
        const team = await updateTeamLogo(input.id, input.logoUrl);
        await logStaff(ctx, "UPDATE_TEAM_LOGO", `Updated logo for team ${input.id}`);
        return team;
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
        
        // Get updated team stats
        const winner = await getTeamById(input.winnerId);
        const loser = await getTeamById(input.loserId);
        
        // Detailed match log
        const matchLog = `
🏆 PARTITA REGISTRATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️  ${match.winnerName} = VITTORIA vs ${match.loserName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATISTICHE ${match.winnerName.toUpperCase()} (VINCITORE):
   • Vittorie: ${winner?.wins ?? 0}
   • Sconfitte: ${winner?.losses ?? 0}
   • ELO: ${match.winnerEloBefore} → ${(winner?.elo ?? 0)} (+${match.eloChange})
   • Streak: ${winner?.streak ?? 0}W
   • Miglior Streak: ${winner?.bestStreak ?? 0}W

📊 STATISTICHE ${match.loserName.toUpperCase()} (SCONFITTO):
   • Vittorie: ${loser?.wins ?? 0}
   • Sconfitte: ${loser?.losses ?? 0}
   • ELO: ${match.loserEloBefore} → ${(loser?.elo ?? 0)} (-${match.eloChange})
   • Streak: ${loser?.streak ?? 0}L

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
        
        console.log(matchLog);
        await logStaff(ctx, "ADD_MATCH", matchLog);
        

        // Send Discord webhook notification
        try {
          const webhooks = await getActiveDiscordWebhooks();
          const eloChangeStr = match.eloChange > 0 ? `+${match.eloChange}` : `${match.eloChange}`;
          const message = {
            embeds: [{
              title: "🏆 Nuovo Risultato Partita",
              description: `**${match.winnerName}** ha battuto **${match.loserName}**`,
              fields: [
                { name: "ELO Vincitore", value: `${match.winnerEloBefore} → ${match.winnerEloBefore + match.eloChange}`, inline: true },
                { name: "ELO Sconfitto", value: `${match.loserEloBefore} → ${match.loserEloBefore - match.eloChange}`, inline: true },
                { name: "Trasferimento ELO", value: eloChangeStr, inline: false },
              ],
              color: 0xFFD700,
              timestamp: new Date().toISOString(),
            }]
          };
          
          for (const webhook of webhooks) {
            try {
              await axios.post(webhook.webhookUrl, message);
              console.log(`[Discord] ✅ Notifica inviata a ${webhook.channelName || 'webhook'}: ${match.winnerName} vs ${match.loserName}`);
            } catch (err) {
              console.warn(`[Discord] ❌ Errore invio webhook a ${webhook.channelName || 'webhook'}:`, err);
            }
          }
        } catch (err) {
          console.warn("[Discord] ❌ Errore durante l'invio dei webhook:", err);
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
      const allUsers = await getAllUsers();
      
      // Champion: first team in ELO leaderboard
      const champion = teams.length > 0 ? teams.sort((a, b) => b.elo - a.elo)[0] : null;
      
      // Best streak team
      const bestStreakTeam = teams.length > 0 ? teams.sort((a, b) => b.streak - a.streak)[0] : null;
      
      // Matches in last 24 hours
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const matches24h = matches.filter(m => new Date(m.createdAt) > oneDayAgo);
      
      return {
        totalTeams: teams.length,
        totalMatches: matches.length,
        totalPlayers: allUsers.length,
        champion: champion,
        matches24h: matches24h.length,
        bestStreakTeam: bestStreakTeam,
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
        await logStaff(ctx, "ADD_DISCORD_WEBHOOK", `✅ Webhook aggiunto per il canale: ${input.channelName || "senza nome"}`);
        console.log(`[Discord] ✅ Nuovo webhook aggiunto: ${input.channelName || "senza nome"} - ${input.webhookUrl.substring(0, 30)}...`);
        return { success: true };
      }),
    deleteWebhook: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteDiscordWebhook(input.id);
        await logStaff(ctx, "DELETE_DISCORD_WEBHOOK", `🗑️ Webhook eliminato (ID: ${input.id})`);
        console.log(`[Discord] 🗑️ Webhook eliminato - ID: ${input.id}`);
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

  // ─── Factions ────────────────────────────────────────────────────────────────
  factions: router({
    list: publicProcedure.query(async () => {
      const { getAllFactions } = await import("./db");
      return getAllFactions();
    }),
    getUserFactions: protectedProcedure.query(async ({ ctx }) => {
      const { getUserFactions } = await import("./db");
      return getUserFactions(ctx.user.id);
    }),
    create: staffProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { createFaction, addFactionMember, getFactionByName, createFactionRole } = await import("./db");
        await createFaction({ name: input.name, description: input.description, createdBy: ctx.user.id });
        
        // Auto-assign creator to the faction and create faction role
        const faction = await getFactionByName(input.name);
        if (faction) {
          await addFactionMember(faction.id, ctx.user.id, ctx.user.id);
          // Auto-create faction role with the same name
          await createFactionRole(faction.id, input.name);
        }
        
        await logStaff(ctx, "CREATE_FACTION", `Created faction: ${input.name}`);
        return { success: true };
      }),
    getMembers: publicProcedure
      .input(z.object({ factionId: z.number() }))
      .query(async ({ input }) => {
        const { getFactionMembers } = await import("./db");
        return getFactionMembers(input.factionId);
      }),
    addMember: staffProcedure
      .input(z.object({ factionId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { addFactionMember } = await import("./db");
        await addFactionMember(input.factionId, input.userId, ctx.user.id);
        await logStaff(ctx, "ADD_FACTION_MEMBER", `Added user ${input.userId} to faction ${input.factionId}`);
        return { success: true };
      }),
    removeMember: staffProcedure
      .input(z.object({ factionId: z.number(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { removeFactionMember } = await import("./db");
        await removeFactionMember(input.factionId, input.userId);
        await logStaff(ctx, "REMOVE_FACTION_MEMBER", `Removed user ${input.userId} from faction ${input.factionId}`);
        return { success: true };
      }),
  }),

  // ─── Win Submissions ──────────────────────────────────────────────────────────
  winSubmissions: router({
    create: protectedProcedure
      .input(z.object({ winnerFactionId: z.number(), loserFactionId: z.number(), screenshotUrl: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { createWinSubmission } = await import("./db");
        await createWinSubmission({
          submittedBy: ctx.user.id,
          winnerFactionId: input.winnerFactionId,
          loserFactionId: input.loserFactionId,
          screenshotUrl: input.screenshotUrl,
        });
        return { success: true };
      }),
    getPending: staffProcedure.query(async () => {
      const { getPendingWinSubmissions } = await import("./db");
      return getPendingWinSubmissions();
    }),
    approve: staffProcedure
      .input(z.object({ submissionId: z.number(), loserFactionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { getWinSubmissionById, approveWinSubmission, updateTeam, getTeamById, updateWinSubmissionLoser, getFactionById, createTeam } = await import("./db");
        const submission = await getWinSubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        
        // Update submission with loser faction
        await updateWinSubmissionLoser(input.submissionId, input.loserFactionId);
        
        // Get factions
        const winnerFaction = await getFactionById(submission.winnerFactionId);
        const loserFaction = await getFactionById(input.loserFactionId);
        if (!winnerFaction || !loserFaction) throw new TRPCError({ code: "NOT_FOUND", message: "Faction not found" });
        
        // Get or create teams for factions
        let winnerTeam = await getTeamById(submission.winnerFactionId);
        if (!winnerTeam) {
          winnerTeam = await createTeam(winnerFaction.name);
        }
        
        let loserTeam = await getTeamById(input.loserFactionId);
        if (!loserTeam) {
          loserTeam = await createTeam(loserFaction.name);
        }
        
        if (!winnerTeam || !loserTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
        
        // Use addMatch to properly record the win
        const { addMatch } = await import("./db");
        await addMatch(winnerTeam.id, loserTeam.id);
        
        // Approve submission
        await approveWinSubmission(input.submissionId, ctx.user.id);
        await logStaff(ctx, "APPROVE_WIN", `Approved win submission ${input.submissionId}`);
        
        // Send Discord notification
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhook) {
          try {
            const eloChange = calculateEloChange(winnerTeam.elo, loserTeam.elo);
            await fetch(discordWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [{
                  title: "✅ Win Approved",
                  description: `${winnerFaction.name} defeated ${loserFaction.name}`,
                  color: 0x00FF00,
                  fields: [
                    { name: "Winner", value: winnerFaction.name, inline: true },
                    { name: "Loser", value: loserFaction.name, inline: true },
                    { name: "ELO Change", value: `+${eloChange}`, inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                }],
              }),
            });
          } catch (err) {
            console.error("Discord notification failed:", err);
          }
        }
        
        return { success: true };
      }),
    reject: staffProcedure
      .input(z.object({ submissionId: z.number(), reason: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { rejectWinSubmission, getWinSubmissionById, getFactionById } = await import("./db");
        const submission = await getWinSubmissionById(input.submissionId);
        await rejectWinSubmission(input.submissionId, input.reason);
        await logStaff(ctx, "REJECT_WIN", `Rejected win submission ${input.submissionId}: ${input.reason}`);
        
        // Send Discord notification
        const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhook && submission) {
          try {
            const faction = await getFactionById(submission.winnerFactionId);
            await fetch(discordWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [{
                  title: "❌ Win Rejected",
                  description: `Win submission from ${faction?.name} was rejected`,
                  color: 0xFF0000,
                  fields: [
                    { name: "Reason", value: input.reason, inline: false },
                  ],
                  timestamp: new Date().toISOString(),
                }],
              }),
            });
          } catch (err) {
            console.error("Discord notification failed:", err);
          }
        }
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
