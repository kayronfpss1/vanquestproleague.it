import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users (custom auth: email/password/username) ─────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "staff", "ceo", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Auth Sessions (custom auth) ──────────────────────────────────────────────
export const authSessions = mysqlTable("auth_sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  userId: int("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = typeof authSessions.$inferInsert;

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  elo: int("elo").default(1500).notNull(),
  streak: int("streak").default(0).notNull(),           // current win streak (negative = losing streak)
  bestStreak: int("best_streak").default(0).notNull(),  // best win streak ever
  freeroamWins: int("freeroam_wins").default(0).notNull(),
  freeroamLosses: int("freeroam_losses").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── Matches ─────────────────────────────────────────────────────────────────
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  winnerId: int("winner_id").notNull(),
  loserId: int("loser_id").notNull(),
  winnerName: varchar("winner_name", { length: 100 }).notNull(),
  loserName: varchar("loser_name", { length: 100 }).notNull(),
  winnerEloBefore: int("winner_elo_before").notNull(),
  loserEloBefore: int("loser_elo_before").notNull(),
  eloChange: int("elo_change").notNull(),               // points transferred
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Elo History (for progression chart) ─────────────────────────────────────
export const eloHistory = mysqlTable("elo_history", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("team_id").notNull(),
  elo: int("elo").notNull(),
  matchId: int("match_id"),                             // nullable: manual edits have no match
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export type EloHistory = typeof eloHistory.$inferSelect;
export type InsertEloHistory = typeof eloHistory.$inferInsert;

// ─── Staff Logs ───────────────────────────────────────────────────────────────
export const staffLogs = mysqlTable("staff_logs", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staff_id").notNull(),
  staffName: varchar("staff_name", { length: 200 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),  // e.g. "ADD_MATCH", "DELETE_TEAM"
  details: text("details"),                              // JSON or human-readable description
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffLog = typeof staffLogs.$inferSelect;
export type InsertStaffLog = typeof staffLogs.$inferInsert;

// API Keys for bot/external services
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  isActive: int("is_active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
