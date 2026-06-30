import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Shield, Plus, Trash2, Edit3, Swords, Trophy, TrendingDown, TrendingUp,
  AlertTriangle, RotateCcw, ClipboardList, Users, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { TableSkeleton } from "@/components/EsportUI";

type Tab = "teams" | "matches" | "logs" | "factions" | "wins" | "users";

export default function StaffDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("teams");

  // ─── Auth gate ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-grid pt-24 flex items-center justify-center">
        <div className="shimmer w-64 h-12 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">STAFF ACCESS REQUIRED</h2>
          <p className="text-muted-foreground font-sans mb-8">You must be logged in with staff privileges to access this dashboard.</p>
          <a href={getLoginUrl()}>
            <button className="w-full px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
              LOGIN TO CONTINUE
            </button>
          </a>
        </div>
      </div>
    );
  }

  const isStaff = user?.role === "admin" || user?.role === "staff" || user?.role === "ceo";

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">ACCESS DENIED</h2>
          <p className="text-muted-foreground font-sans">Your account does not have staff privileges.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "teams" as Tab, label: "TEAM MANAGEMENT", icon: Users },
    { id: "matches" as Tab, label: "MATCH MANAGEMENT", icon: Swords },
    { id: "factions" as Tab, label: "FACTIONS", icon: Shield },
    { id: "wins" as Tab, label: "WIN SUBMISSIONS", icon: Trophy },
    { id: "users" as Tab, label: "USERS", icon: Users },
    { id: "logs" as Tab, label: "STAFF LOGS", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-secondary/20 border border-secondary/30">
              <Shield className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-display tracking-widest text-secondary uppercase">Staff Panel</p>
              <h1 className="text-3xl md:text-4xl font-display font-900 text-foreground">DASHBOARD</h1>
            </div>
          </div>
          <p className="text-muted-foreground font-sans">Logged in as <span className="text-foreground font-600">{user.name}</span> — all actions are automatically logged.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap animate-fade-in-up delay-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-700 tracking-widest transition-all duration-200 ${
                activeTab === id
                  ? "bg-secondary text-secondary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:border-secondary/40 hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === "teams" && <TeamManagement />}
          {activeTab === "matches" && <MatchManagement />}
          {activeTab === "factions" && <FactionManagement />}
          {activeTab === "wins" && <WinSubmissions />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "logs" && <StaffLogs />}
        </div>
      </div>
    </div>
  );
}

// ─── Team Management ──────────────────────────────────────────────────────────
function TeamManagement() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.teams.list.useQuery();
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [editElo, setEditElo] = useState("");
  const [editEloReason, setEditEloReason] = useState("");
  const [penalty, setPenalty] = useState("");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyTeamId, setPenaltyTeamId] = useState<number | null>(null);

  const createTeam = trpc.teams.create.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); setNewTeamName(""); toast.success("Team created successfully!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); toast.success("Team deleted."); },
    onError: (e: any) => toast.error(e.message),
  });
  const editEloMutation = trpc.staff.editElo.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); setEditingTeam(null); setEditElo(""); setEditEloReason(""); toast.success("Elo updated!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const applyPenalty = trpc.staff.applyPenalty.useMutation({
    onSuccess: () => { utils.teams.list.invalidate(); setPenaltyTeamId(null); setPenalty(""); setPenaltyReason(""); toast.success("Penalty applied!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addWin = trpc.staff.addWin.useMutation({ onSuccess: () => { utils.teams.list.invalidate(); toast.success("Win added."); }, onError: (e: any) => toast.error(e.message) });
  const removeWin = trpc.staff.removeWin.useMutation({ onSuccess: () => { utils.teams.list.invalidate(); toast.success("Win removed."); }, onError: (e: any) => toast.error(e.message) });
  // Removed addLoss and removeLoss - use addWin/removeWin instead

  return (
    <div className="space-y-6">
      {/* Create Team */}
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> CREATE TEAM
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Team name..."
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && newTeamName.trim() && createTeam.mutate({ name: newTeamName.trim() })}
            className="flex-1 px-4 py-2.5 rounded-xl bg-input border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground font-sans transition-all"
          />
          <button
            onClick={() => newTeamName.trim() && createTeam.mutate({ name: newTeamName.trim() })}
            disabled={!newTeamName.trim() || createTeam.isPending}
            className="px-5 py-2.5 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {createTeam.isPending ? "..." : "CREATE"}
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div className="card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-display font-700 text-foreground">REGISTERED TEAMS</h3>
        </div>
        {isLoading ? (
          <div className="p-5"><TableSkeleton rows={5} /></div>
        ) : teams?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-sans">No teams yet. Create one above.</div>
        ) : (
          teams?.map((team, i) => (
            <div key={team.id} className="border-b border-border/20 last:border-0 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                {/* Team info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-display font-800 text-primary">{team.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-display font-700 text-foreground">{team.name}</p>
                    <p className="text-xs text-muted-foreground font-sans">{team.elo} ELO · {team.wins}W {team.losses}L</p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => addWin.mutate({ teamId: team.id })} title="Add Win" className="p-2 rounded-lg bg-win/10 text-win hover:bg-win/20 border border-win/20 transition-all text-xs font-display font-700">+W</button>
                  <button onClick={() => removeWin.mutate({ teamId: team.id })} title="Remove Win" className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent border border-border transition-all text-xs font-display font-700">-W</button>
                  <button onClick={() => { setEditingTeam(editingTeam === team.id ? null : team.id); setEditElo(String(team.elo)); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 transition-all text-xs font-display font-700">
                    <Edit3 className="w-3.5 h-3.5" /> ELO
                  </button>
                  <button onClick={() => { setPenaltyTeamId(penaltyTeamId === team.id ? null : team.id); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all text-xs font-display font-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> PENALTY
                  </button>
                  <button onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteTeam.mutate({ id: team.id }); }} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Edit Elo panel */}
              {editingTeam === team.id && (
                <div className="px-5 pb-4 pt-0 border-t border-border/30 bg-muted/20 animate-fade-in">
                  <p className="text-xs font-display tracking-widest text-secondary uppercase mb-3 mt-3">EDIT ELO — {team.name}</p>
                  <div className="flex flex-wrap gap-3">
                    <input type="number" value={editElo} onChange={e => setEditElo(e.target.value)} className="w-32 px-3 py-2 rounded-lg bg-input border border-border focus:border-secondary/50 focus:outline-none text-foreground font-display font-700 transition-all" />
                    <input type="text" placeholder="Reason (optional)..." value={editEloReason} onChange={e => setEditEloReason(e.target.value)} className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-input border border-border focus:border-secondary/50 focus:outline-none text-foreground placeholder:text-muted-foreground font-sans transition-all" />
                    <button onClick={() => editEloMutation.mutate({ teamId: team.id, newElo: parseInt(editElo) })} disabled={!editElo || editEloMutation.isPending} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-display font-700 text-sm disabled:opacity-50 transition-all">
                      {editEloMutation.isPending ? "..." : "APPLY"}
                    </button>
                    <button onClick={() => setEditingTeam(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground font-display font-700 text-sm transition-all">CANCEL</button>
                  </div>
                </div>
              )}

              {/* Penalty panel */}
              {penaltyTeamId === team.id && (
                <div className="px-5 pb-4 pt-0 border-t border-border/30 bg-destructive/5 animate-fade-in">
                  <p className="text-xs font-display tracking-widest text-destructive uppercase mb-3 mt-3">APPLY PENALTY — {team.name}</p>
                  <div className="flex flex-wrap gap-3">
                    <input type="number" placeholder="Elo penalty..." value={penalty} onChange={e => setPenalty(e.target.value)} className="w-36 px-3 py-2 rounded-lg bg-input border border-border focus:border-destructive/50 focus:outline-none text-foreground font-display font-700 transition-all" />
                    <input type="text" placeholder="Reason (optional)..." value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-input border border-border focus:border-destructive/50 focus:outline-none text-foreground placeholder:text-muted-foreground font-sans transition-all" />
                    <button onClick={() => applyPenalty.mutate({ teamId: team.id, penaltyElo: parseInt(penalty) })} disabled={!penalty || applyPenalty.isPending} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-display font-700 text-sm disabled:opacity-50 transition-all">
                      {applyPenalty.isPending ? "..." : "APPLY"}
                    </button>
                    <button onClick={() => setPenaltyTeamId(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground font-display font-700 text-sm transition-all">CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Match Management ─────────────────────────────────────────────────────────
function MatchManagement() {
  const utils = trpc.useUtils();
  const { data: teams } = trpc.teams.list.useQuery();
  const { data: matches, isLoading: matchesLoading } = trpc.matches.list.useQuery();
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");

  const addMatch = trpc.matches.add.useMutation({
    onSuccess: () => {
      utils.matches.list.invalidate();
      utils.teams.list.invalidate();
      utils.leaderboard.byElo.invalidate();
      utils.leaderboard.byWins.invalidate();
      utils.leaderboard.byKd.invalidate();
      utils.stats.global.invalidate();
      setWinnerId(""); setLoserId("");
      toast.success("Match added! Elo updated automatically.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMatch = trpc.matches.remove.useMutation({
    onSuccess: () => {
      utils.matches.list.invalidate();
      utils.teams.list.invalidate();
      utils.leaderboard.byElo.invalidate();
      toast.success("Match removed and Elo reverted.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Removed undoMatch - undo procedure doesn't exist

  const canAdd = winnerId && loserId && winnerId !== loserId;

  return (
    <div className="space-y-6">
      {/* Add Match */}
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4 flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" /> ADD MATCH RESULT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-display tracking-widest text-win uppercase mb-2 block">Winner</label>
            <select value={winnerId} onChange={e => setWinnerId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border focus:border-win/50 focus:outline-none text-foreground font-sans transition-all">
              <option value="">Select winner...</option>
              {teams?.map(t => <option key={t.id} value={t.id}>{t.name} ({t.elo} ELO)</option>)}
            </select>
          </div>
          <div className="flex items-center justify-center pb-1">
            <span className="text-muted-foreground font-display font-700 text-sm">VS</span>
          </div>
          <div>
            <label className="text-xs font-display tracking-widest text-loss uppercase mb-2 block">Loser</label>
            <select value={loserId} onChange={e => setLoserId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-input border border-border focus:border-loss/50 focus:outline-none text-foreground font-sans transition-all">
              <option value="">Select loser...</option>
              {teams?.filter(t => String(t.id) !== winnerId).map(t => <option key={t.id} value={t.id}>{t.name} ({t.elo} ELO)</option>)}
            </select>
          </div>
          <button
            onClick={() => canAdd && addMatch.mutate({ winnerId: parseInt(winnerId), loserId: parseInt(loserId) })}
            disabled={!canAdd || addMatch.isPending}
            className="px-6 py-2.5 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-purple"
          >
            {addMatch.isPending ? "..." : "ADD MATCH"}
          </button>
        </div>
        {winnerId && loserId && winnerId !== loserId && (() => {
          const w = teams?.find(t => String(t.id) === winnerId);
          const l = teams?.find(t => String(t.id) === loserId);
          if (!w || !l) return null;
          const expected = 1 / (1 + Math.pow(10, (l.elo - w.elo) / 400));
          const change = Math.round(32 * (1 - expected));
          return (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50 flex flex-wrap gap-4 text-sm font-display">
              <span className="text-muted-foreground">Elo preview:</span>
              <span className="text-win">{w.name}: {w.elo} → {w.elo + change} <span className="text-xs">(+{change})</span></span>
              <span className="text-loss">{l.name}: {l.elo} → {l.elo - change} <span className="text-xs">(-{change})</span></span>
            </div>
          );
        })()}
      </div>

      {/* Match List */}
      <div className="card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-lg font-display font-700 text-foreground">RECENT MATCHES</h3>
        </div>
        {matchesLoading ? (
          <div className="p-5"><TableSkeleton rows={5} /></div>
        ) : matches?.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-sans">No matches yet.</div>
        ) : (
          matches?.map((match, i) => (
            <div key={match.id} className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border/20 last:border-0 table-row-hover animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
              <span className="text-xs font-display text-muted-foreground w-10">#{match.id}</span>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Trophy className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                <span className="font-display font-700 text-win truncate">{match.winnerName}</span>
                <span className="text-muted-foreground text-xs font-display flex-shrink-0">VS</span>
                <span className="font-display font-500 text-muted-foreground truncate">{match.loserName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-win font-display font-700 text-sm">+{match.eloChange}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{new Date(match.createdAt).toLocaleDateString("it-IT")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (confirm(`Delete match #${match.id}?`)) removeMatch.mutate({ id: match.id }); }} title="Delete match" className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Staff Logs ───────────────────────────────────────────────────────────────
function StaffLogs() {
  const { data: logs, isLoading } = trpc.staff.logs.useQuery();

  const actionColors: Record<string, string> = {
    ADD_MATCH: "text-win bg-win/10 border-win/30",
    REMOVE_MATCH: "text-loss bg-loss/10 border-loss/30",
    UNDO_MATCH: "text-secondary bg-secondary/10 border-secondary/30",
    CREATE_TEAM: "text-primary bg-primary/10 border-primary/30",
    DELETE_TEAM: "text-destructive bg-destructive/10 border-destructive/30",
    UPDATE_TEAM: "text-foreground bg-muted border-border",
    EDIT_ELO: "text-secondary bg-secondary/10 border-secondary/30",
    APPLY_PENALTY: "text-destructive bg-destructive/10 border-destructive/30",
    ADD_WIN: "text-win bg-win/10 border-win/30",
    REMOVE_WIN: "text-muted-foreground bg-muted border-border",
    ADD_LOSS: "text-loss bg-loss/10 border-loss/30",
    REMOVE_LOSS: "text-muted-foreground bg-muted border-border",
  };

  return (
    <div className="card-premium overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-lg font-display font-700 text-foreground">STAFF ACTION LOG</h3>
        <span className="text-xs text-muted-foreground font-sans">{logs?.length ?? 0} entries</span>
      </div>
      {isLoading ? (
        <div className="p-5"><TableSkeleton rows={8} /></div>
      ) : logs?.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground font-sans">No staff actions logged yet.</div>
      ) : (
        logs?.map((log: any, i: number) => (
          <div key={log.id} className="flex flex-wrap items-start gap-3 px-5 py-4 border-b border-border/20 last:border-0 animate-fade-in" style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}>
            <span className="text-xs font-display text-muted-foreground w-10 flex-shrink-0 mt-0.5">#{log.id}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`stat-badge border text-xs ${actionColors[log.action] ?? "text-foreground bg-muted border-border"}`}>{log.action}</span>
                <span className="text-sm font-display font-600 text-foreground">{log.staffName}</span>
              </div>
              <p className="text-sm text-muted-foreground font-sans">{log.details}</p>
            </div>
            <span className="text-xs text-muted-foreground font-sans flex-shrink-0">
              {new Date(log.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}


// ─── Faction Management ──────────────────────────────────────────────────────
function FactionManagement() {
  const { data: factions, isLoading } = trpc.factions.list.useQuery();
  const { data: allUsers } = trpc.admin.users.useQuery();
  const [newFactionName, setNewFactionName] = useState("");
  const [newFactionDesc, setNewFactionDesc] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const createFaction = trpc.factions.create.useMutation({
    onSuccess: () => { utils.factions.list.invalidate(); setNewFactionName(""); setNewFactionDesc(""); toast.success("Faction created!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMember = trpc.factions.addMember.useMutation({
    onSuccess: () => { utils.factions.list.invalidate(); setSelectedUserId(null); toast.success("Member added to faction!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRole = trpc.factions.deleteRole.useMutation({
    onSuccess: () => { utils.factions.list.invalidate(); toast.success("Role deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFaction = trpc.factions.delete.useMutation({
    onSuccess: () => { utils.factions.list.invalidate(); toast.success("Faction deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Create Faction */}
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> CREATE FACTION
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Faction name..."
            value={newFactionName}
            onChange={(e) => setNewFactionName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            placeholder="Description (optional)..."
            value={newFactionDesc}
            onChange={(e) => setNewFactionDesc(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
          <button
            onClick={() => createFaction.mutate({ name: newFactionName, description: newFactionDesc })}
            disabled={!newFactionName || createFaction.isPending}
            className="w-full px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-display font-600 disabled:opacity-50"
          >
            {createFaction.isPending ? "Creating..." : "Create Faction"}
          </button>
        </div>
      </div>

      {/* Factions List */}
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4">FACTIONS</h3>
        {isLoading ? (
          <TableSkeleton />
        ) : factions && factions.length > 0 ? (
          <div className="space-y-3">
            {factions.map((faction) => (
              <div key={faction.id} className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-display font-600 text-foreground">{faction.name}</h4>
                    {faction.description && <p className="text-sm text-muted-foreground">{faction.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFaction(selectedFaction === faction.id ? null : faction.id)}
                      className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-display font-600 text-sm"
                    >
                      {selectedFaction === faction.id ? "Hide" : "Manage"}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Sei sicuro di voler eliminare la fazione "${faction.name}"? Tutti i membri e i ruoli verranno rimossi.`)) deleteFaction.mutate({ factionId: faction.id }); }}
                      disabled={deleteFaction.isPending}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {selectedFaction === faction.id && (
                  <div className="mt-3 pt-3 border-t border-secondary/20 space-y-4">
                    {/* Roles Section */}
                    <div>
                      <p className="text-xs font-display font-600 text-primary mb-2 uppercase tracking-widest">Faction Roles</p>
                      <FactionRoles factionId={faction.id} />
                    </div>

                    {/* Add Member Section */}
                    <div>
                      <p className="text-xs font-display font-600 text-primary mb-2 uppercase tracking-widest">Add Member</p>
                      <select
                        value={selectedUserId ?? ""}
                        onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary/90 border border-secondary/30 text-background font-600 text-sm mb-2"
                      >
                        <option value="" className="bg-background text-foreground">Select player to add...</option>
                        {allUsers?.map((u) => (
                          <option key={u.id} value={u.id} className="bg-background text-foreground">
                            {u.username || u.name || `User ${u.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedUserId) {
                          addMember.mutate({ factionId: faction.id, userId: selectedUserId });
                        }
                      }}
                      disabled={!selectedUserId || addMember.isPending}
                      className="w-full px-3 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-display font-600 text-sm disabled:opacity-50"
                    >
                      {addMember.isPending ? "Adding..." : "Add Member"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No factions yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Win Submissions ──────────────────────────────────────────────────────────
function WinSubmissions() {
  const { data: submissions, isLoading } = trpc.winSubmissions.getPending.useQuery();
  const { data: factions } = trpc.factions.list.useQuery();
  const utils = trpc.useUtils();

  const approveWin = trpc.winSubmissions.approve.useMutation({
    onSuccess: () => { utils.winSubmissions.getPending.invalidate(); toast.success("Win approved and ELO updated!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectWin = trpc.winSubmissions.reject.useMutation({
    onSuccess: () => { utils.winSubmissions.getPending.invalidate(); toast.success("Win rejected."); },
    onError: (e: any) => toast.error(e.message),
  });

  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [selectedLoserFaction, setSelectedLoserFaction] = useState<Record<number, number>>({});

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> PENDING WIN SUBMISSIONS
        </h3>
        {isLoading ? (
          <TableSkeleton />
        ) : submissions && submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const winnerFaction = factions?.find(f => f.id === sub.winnerFactionId);
              return (
                <div key={sub.id} className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="mb-4">
                    <p className="font-display font-600 text-foreground mb-2">
                      {winnerFaction?.name || `Faction ${sub.winnerFactionId}`} (WINNER)
                    </p>
                    {sub.screenshotUrl && (
                      <a href={sub.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mb-2">
                        📸 View Screenshot
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(sub.createdAt).toLocaleString("it-IT")}
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-display font-600 text-foreground mb-2 block">SELECT LOSER FACTION</label>
                    <select
                      value={selectedLoserFaction[sub.id] || ""}
                      onChange={(e) => setSelectedLoserFaction({ ...selectedLoserFaction, [sub.id]: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground text-sm"
                    >
                      <option value="">-- Choose Faction --</option>
                      {factions?.filter(f => f.id !== sub.winnerFactionId).map(faction => (
                        <option key={faction.id} value={faction.id}>
                          {faction.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!selectedLoserFaction[sub.id]) {
                          toast.error("Please select the loser faction");
                          return;
                        }
                        approveWin.mutate({ submissionId: sub.id, loserFactionId: selectedLoserFaction[sub.id] });
                      }}
                      disabled={approveWin.isPending || !selectedLoserFaction[sub.id]}
                      className="flex-1 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 font-display font-600 text-sm disabled:opacity-50"
                    >
                      {approveWin.isPending ? "Approving..." : "✓ APPROVE"}
                    </button>
                    <input
                      type="text"
                      placeholder="Rejection reason..."
                      value={rejectReason[sub.id] ?? ""}
                      onChange={(e) => setRejectReason({ ...rejectReason, [sub.id]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground text-sm placeholder-muted-foreground"
                    />
                    <button
                      onClick={() => rejectWin.mutate({ submissionId: sub.id, reason: rejectReason[sub.id] || "No reason provided" })}
                      disabled={rejectWin.isPending}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-display font-600 text-sm disabled:opacity-50"
                    >
                      {rejectWin.isPending ? "Rejecting..." : "✗ REJECT"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No pending win submissions</p>
        )}
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────
function FactionRoles({ factionId }: { factionId: number }) {
  const { data: roles, isLoading } = trpc.factions.getRoles.useQuery({ factionId });
  const utils = trpc.useUtils();

  const deleteRole = trpc.factions.deleteRole.useMutation({
    onSuccess: () => {
      utils.factions.getRoles.invalidate({ factionId });
      toast.success("Role deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="shimmer h-8 w-full rounded" />;
  if (!roles || roles.length === 0) return <p className="text-xs text-muted-foreground italic">No roles created for this faction.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => (
        <div key={role.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/30">
          <span className="text-xs font-display font-600 text-secondary">{role.name}</span>
          <button
            onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRole.mutate({ roleId: role.id }); }}
            disabled={deleteRole.isPending}
            className="text-destructive hover:text-destructive/80 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function UserManagement() {
  const { data: users, isLoading } = trpc.admin.users.useQuery();
  const { data: factions } = trpc.factions.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<number | null>(null);

  const addFactionRole = trpc.factions.addMember.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success("Ruolo fazione assegnato!");
      setSelectedUser(null);
      setSelectedFaction(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeFactionRole = trpc.factions.removeMember.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success("Ruolo fazione rimosso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="card-premium p-6">
        <h3 className="text-lg font-display font-700 text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> GESTIONE UTENTI
        </h3>

        {isLoading ? (
          <TableSkeleton />
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            {users.map((u: any) => (
              <div key={u.id} className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-display font-600 text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="stat-badge bg-primary/20 text-primary border border-primary/30">{u.role}</span>
                </div>

                {/* User Factions */}
                {u.factionMembers && u.factionMembers.length > 0 && (
                  <div className="mb-3 p-2 rounded bg-primary/5 border border-primary/10">
                    <p className="text-xs font-display font-600 text-primary mb-2">FAZIONI ASSEGNATE:</p>
                    <div className="flex flex-wrap gap-2">
                      {u.factionMembers.map((fm: any) => {
                        const faction = factions?.find(f => f.id === fm.factionId);
                        return (
                          <div key={fm.id} className="flex items-center gap-2 px-2 py-1 rounded bg-primary/20 border border-primary/30">
                            <span className="text-xs text-primary">{faction?.name}</span>
                            <button
                              onClick={() => removeFactionRole.mutate({ factionId: fm.factionId, userId: u.id })}
                              disabled={removeFactionRole.isPending}
                              className="text-xs text-destructive hover:text-destructive/80 transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add Faction */}
                {selectedUser === u.id ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedFaction || ""}
                      onChange={(e) => setSelectedFaction(parseInt(e.target.value))}
                      className="flex-1 px-2 py-1 rounded text-xs bg-secondary/90 border border-secondary/30 text-background font-600"
                    >
                      <option value="" className="bg-background text-foreground">Seleziona fazione...</option>
                      {factions?.map(f => (
                        <option key={f.id} value={f.id} className="bg-background text-foreground">{f.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (selectedFaction) {
                          addFactionRole.mutate({ factionId: selectedFaction, userId: u.id });
                        }
                      }}
                      disabled={!selectedFaction || addFactionRole.isPending}
                      className="px-3 py-1 rounded text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 font-600 disabled:opacity-50"
                    >
                      ASSEGNA
                    </button>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="px-3 py-1 rounded text-xs bg-secondary/20 hover:bg-secondary/30 text-foreground font-600"
                    >
                      ANNULLA
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedUser(u.id)}
                    className="w-full px-3 py-1 rounded text-xs bg-primary/20 hover:bg-primary/30 text-primary font-600 transition-all"
                  >
                    + AGGIUNGI RUOLO FAZIONE
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Nessun utente trovato</p>
        )}
      </div>
    </div>
  );
}
