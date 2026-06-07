# FiveM Torneo eSports – TODO

## Database
- [x] Schema: teams table (name, wins, losses, elo, streak, best_streak, kd, freeroam_wins, freeroam_losses)
- [x] Schema: matches table (winner_id, loser_id, winner_elo_before, loser_elo_before, elo_change, created_at)
- [x] Schema: staff_logs table (staff_id, staff_name, action, details, created_at)
- [x] Schema: elo_history table (team_id, elo, match_id, recorded_at) for chart
- [x] Migration SQL applied via webdev_execute_sql

## Backend (tRPC Routers)
- [x] teams router: list, getById, create, update, delete
- [x] matches router: list, add (with Elo calc), remove, undo
- [x] leaderboard router: byElo, byWins, byKd
- [x] stats router: global tournament stats
- [x] staff router: protected procedures for all management actions (addWin, removeWin, addLoss, removeLoss, editElo, applyPenalty)
- [x] staff_logs router: list logs (protected)
- [x] Elo system: K=32, start 1500, standard formula
- [x] adminProcedure guard: role=admin required for all staff actions
- [x] Automatic staff logging on every action

## Frontend Pages
- [x] Global CSS theme: black/purple/gold palette, Orbitron/Rajdhani fonts
- [x] App.tsx routing setup with NavBar
- [x] Home page: top-10 leaderboard + global stats + recent matches
- [x] Leaderboard page: 3 tabs (Elo, Wins, KD)
- [x] Teams page: grid with search
- [x] Team detail page: full stats + match history + Elo progression chart (Recharts)
- [x] Match History page: table with ID, winner, loser, elo change, date, search
- [x] Staff Dashboard: team CRUD, match add/remove/undo, manual Elo edit, penalty
- [x] Staff Logs viewer (protected, admin only)
- [x] Responsive layout (mobile + desktop)
- [x] Animations and micro-interactions (fade-in-up, shimmer, pulse, glow)
- [x] NavBar with auth state and mobile menu

## Quality
- [x] Vitest tests for Elo calculation logic (11 tests, all passing)
- [x] Vitest tests for auth.logout procedure
- [x] Checkpoint saved
