import { eq, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, teams, matches, eloHistory, staffLogs, apiKeys, authSessions, discordWebhooks, teamInvitations, factions, factionMembers, winSubmissions, InsertTeam, InsertMatch, InsertEloHistory, InsertStaffLog, InsertApiKey, InsertAuthSession, InsertDiscordWebhook, InsertTeamInvitation, InsertFaction, InsertFactionMember, InsertWinSubmission } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { randomBytes } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function updateUserRole(userId: number, role: "admin" | "user" | "staff" | "ceo") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

// Custom auth: lookup helpers
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createCustomUser(params: { openId: string; username: string; email: string; passwordHash: string; name: string; role?: "admin" | "user" }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(users).values({
    openId: params.openId,
    username: params.username,
    email: params.email,
    passwordHash: params.passwordHash,
    name: params.name,
    loginMethod: "local",
    role: params.role ?? "user",
    lastSignedIn: new Date(),
  });
  return getUserByUsername(params.username);
}

// Custom auth: session management
export async function createAuthSession(token: string, userId: number, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(authSessions).values({ token, userId, expiresAt });
}

export async function getAuthSession(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(authSessions).where(eq(authSessions.token, token)).limit(1);
  return result[0];
}

export async function deleteAuthSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.token, token));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── ELO calculation ─────────────────────────────────────────────────────────
export const ELO_START = 1500;
export const ELO_K = 32;

export function calculateEloChange(winnerElo: number, loserElo: number): number {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.round(ELO_K * (1 - expected));
}

// ─── Teams ────────────────────────────────────────────────────────────────────
export async function getAllTeams() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).orderBy(desc(teams.elo));
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result[0];
}

export async function getTeamByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teams).where(eq(teams.name, name)).limit(1);
  return result[0];
}

export async function createTeam(name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(teams).values({ name, elo: ELO_START });
  const created = await getTeamByName(name);
  if (!created) throw new Error("Team creation failed");
  // Record initial elo history
  await db.insert(eloHistory).values({ teamId: created.id, elo: ELO_START });
  return created;
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(teams).set(data).where(eq(teams.id, id));
  return getTeamById(id);
}

export async function updateTeamLogo(id: number, logoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(teams).set({ logoUrl }).where(eq(teams.id, id));
  return getTeamById(id);
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(eloHistory).where(eq(eloHistory.teamId, id));
  await db.delete(teams).where(eq(teams.id, id));
}

export async function getTeamStats() {
  const db = await getDb();
  if (!db) return { totalTeams: 0 };
  const result = await db.select({ count: sql<number>`count(*)` }).from(teams);
  return { totalTeams: result[0]?.count ?? 0 };
}

// ─── Matches ─────────────────────────────────────────────────────────────────
export async function getAllMatches(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
}

export async function getMatchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  return result[0];
}

export async function getMatchesByTeamId(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(sql`${matches.winnerId} = ${teamId} OR ${matches.loserId} = ${teamId}`)
    .orderBy(desc(matches.createdAt));
}

export async function addMatch(winnerId: number, loserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const winner = await getTeamById(winnerId);
  const loser = await getTeamById(loserId);
  if (!winner || !loser) throw new Error("Team not found");

  const eloChange = calculateEloChange(winner.elo, loser.elo);

  // Insert match record
  await db.insert(matches).values({
    winnerId,
    loserId,
    winnerName: winner.name,
    loserName: loser.name,
    winnerEloBefore: winner.elo,
    loserEloBefore: loser.elo,
    eloChange,
  });

  // Get the inserted match id
  const [lastMatch] = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.createdAt))
    .limit(1);

  const matchId = lastMatch?.id;

  // Update winner
  const newWinnerElo = winner.elo + eloChange;
  const newWinnerStreak = winner.streak >= 0 ? winner.streak + 1 : 1;
  const newWinnerBestStreak = Math.max(winner.bestStreak, newWinnerStreak);
  await db.update(teams).set({
    wins: winner.wins + 1,
    elo: newWinnerElo,
    streak: newWinnerStreak,
    bestStreak: newWinnerBestStreak,
  }).where(eq(teams.id, winnerId));

  // Update loser
  const newLoserElo = loser.elo - eloChange;
  const newLoserStreak = loser.streak <= 0 ? loser.streak - 1 : -1;
  await db.update(teams).set({
    losses: loser.losses + 1,
    elo: newLoserElo,
    streak: newLoserStreak,
  }).where(eq(teams.id, loserId));

  // Record elo history for both teams
  await db.insert(eloHistory).values([
    { teamId: winnerId, elo: newWinnerElo, matchId },
    { teamId: loserId, elo: newLoserElo, matchId },
  ]);

  return lastMatch;
}

export async function removeMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const match = await getMatchById(matchId);
  if (!match) throw new Error("Match not found");

  const winner = await getTeamById(match.winnerId);
  const loser = await getTeamById(match.loserId);

  // Revert winner stats
  if (winner) {
    const revertedWinnerElo = match.winnerEloBefore;
    const revertedStreak = winner.streak > 0 ? winner.streak - 1 : 0;
    await db.update(teams).set({
      wins: Math.max(0, winner.wins - 1),
      elo: revertedWinnerElo,
      streak: revertedStreak,
    }).where(eq(teams.id, match.winnerId));
  }

  // Revert loser stats
  if (loser) {
    const revertedLoserElo = match.loserEloBefore;
    const revertedStreak = loser.streak < 0 ? loser.streak + 1 : 0;
    await db.update(teams).set({
      losses: Math.max(0, loser.losses - 1),
      elo: revertedLoserElo,
      streak: revertedStreak,
    }).where(eq(teams.id, match.loserId));
  }

  // Remove elo history entries for this match
  await db.delete(eloHistory).where(eq(eloHistory.matchId, matchId));

  // Delete the match
  await db.delete(matches).where(eq(matches.id, matchId));

  return match;
}

export async function getMatchStats() {
  const db = await getDb();
  if (!db) return { totalMatches: 0 };
  const result = await db.select({ count: sql<number>`count(*)` }).from(matches);
  return { totalMatches: result[0]?.count ?? 0 };
}

// ─── Elo History ─────────────────────────────────────────────────────────────
export async function getEloHistoryByTeamId(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(eloHistory)
    .where(eq(eloHistory.teamId, teamId))
    .orderBy(asc(eloHistory.recordedAt));
}

// ─── Staff Logs ───────────────────────────────────────────────────────────────
export async function addStaffLog(entry: InsertStaffLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(staffLogs).values(entry);
}

export async function getStaffLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffLogs).orderBy(desc(staffLogs.createdAt)).limit(limit);
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export async function getLeaderboardByElo(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).orderBy(desc(teams.elo)).limit(limit);
}

export async function getLeaderboardByWins(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).orderBy(desc(teams.wins), desc(teams.elo)).limit(limit);
}

export async function getLeaderboardByKd(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const allTeams = await db.select().from(teams).orderBy(desc(teams.wins)).limit(limit);
  // Sort by KD ratio: wins / max(1, losses)
  return allTeams.sort((a, b) => {
    const kdA = a.wins / Math.max(1, a.losses);
    const kdB = b.wins / Math.max(1, b.losses);
    return kdB - kdA;
  });
}

// API Keys for bot/external services
export async function createApiKey(name: string, description: string, createdBy: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const key = randomBytes(32).toString("hex");
  await db.insert(apiKeys).values({ key, name, description, createdBy, isActive: 1 });
  return key;
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
  return result[0] || null;
}

export async function getApiKeysByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiKeys).where(eq(apiKeys.createdBy, userId));
}

export async function updateApiKeyLastUsed(keyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
}

export async function deleteApiKeyById(keyId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
}

// ─── Discord Webhooks ─────────────────────────────────────────────────────────
export async function getActiveDiscordWebhooks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discordWebhooks).where(eq(discordWebhooks.isActive, 1));
}

export async function addDiscordWebhook(webhookUrl: string, channelName?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(discordWebhooks).values({ webhookUrl, channelName });
}

export async function deleteDiscordWebhook(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(discordWebhooks).where(eq(discordWebhooks.id, id));
}

// ─── Team Invitations ─────────────────────────────────────────────────────────
export async function createTeamInvitation(teamId: number, teamName: string, createdBy: number, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const token = randomBytes(32).toString("hex");
  await db.insert(teamInvitations).values({ token, teamId, teamName, createdBy, expiresAt });
  return token;
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teamInvitations).where(eq(teamInvitations.token, token)).limit(1);
  return result[0];
}

export async function useTeamInvitation(token: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(teamInvitations).set({ usedBy: userId, usedAt: new Date() }).where(eq(teamInvitations.token, token));
}

export async function getTeamInvitations(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamInvitations).where(eq(teamInvitations.teamId, teamId));
}

export async function deleteTeamInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
}


// ─── Faction helpers ──────────────────────────────────────────────────────────
export async function createFaction(params: { name: string; description?: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(factions).values({
    name: params.name,
    description: params.description,
    createdBy: params.createdBy,
  });
  return result;
}

export async function getAllFactions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(factions).orderBy(factions.name);
}

export async function getFactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(factions).where(eq(factions.id, id)).limit(1);
  return result[0];
}

export async function addFactionMember(factionId: number, userId: number, assignedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(factionMembers).values({ factionId, userId, assignedBy });
}

export async function getFactionMembers(factionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(factionMembers).where(eq(factionMembers.factionId, factionId));
}

export async function getUserFactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(factionMembers).where(eq(factionMembers.userId, userId));
}

export async function removeFactionMember(factionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { and } = await import("drizzle-orm");
  await db.delete(factionMembers).where(and(eq(factionMembers.factionId, factionId), eq(factionMembers.userId, userId)));
}

// ─── Win Submission helpers ───────────────────────────────────────────────────
export async function createWinSubmission(params: { submittedBy: number; winnerFactionId: number; loserFactionId: number; screenshotUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(winSubmissions).values({
    submittedBy: params.submittedBy,
    winnerFactionId: params.winnerFactionId,
    loserFactionId: params.loserFactionId,
    screenshotUrl: params.screenshotUrl,
  });
  return result;
}

export async function getPendingWinSubmissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(winSubmissions).where(eq(winSubmissions.status, "pending")).orderBy(desc(winSubmissions.createdAt));
}

export async function approveWinSubmission(submissionId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(winSubmissions).set({ status: "approved", approvedBy, approvedAt: new Date() }).where(eq(winSubmissions.id, submissionId));
}

export async function rejectWinSubmission(submissionId: number, rejectionReason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(winSubmissions).set({ status: "rejected", rejectionReason }).where(eq(winSubmissions.id, submissionId));
}

export async function getWinSubmissionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(winSubmissions).where(eq(winSubmissions.id, id)).limit(1);
  return result[0];
}

export async function updateWinSubmissionLoser(submissionId: number, loserFactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(winSubmissions).set({ loserFactionId }).where(eq(winSubmissions.id, submissionId));
}
