import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Trophy, ArrowLeft, Swords, TrendingUp, TrendingDown, Flame, Star, Shield, Upload, Image } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EloBadge, StreakBadge, KdRatio, WinRateBar, EloChange, TableSkeleton, TierBadge } from "@/components/EsportUI";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id ?? "0");
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const { data: team, isLoading: loadingTeam, refetch: refetchTeam } = trpc.teams.getById.useQuery({ id: teamId }, { enabled: !!teamId });
  const { data: matchHistory, isLoading: loadingMatches } = trpc.matches.getByTeamId.useQuery({ teamId }, { enabled: !!teamId });
  const { data: eloHistory, isLoading: loadingElo } = trpc.eloHistory.getByTeamId.useQuery({ teamId }, { enabled: !!teamId });
  const { data: allTeams } = trpc.leaderboard.byElo.useQuery({ limit: 1000 });
  const teamRank = allTeams?.findIndex(t => t.id === teamId) ?? -1;
  
  const updateLogoMutation = trpc.teams.updateLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo aggiornato!");
      setShowLogoInput(false);
      setLogoUrl("");
      refetchTeam();
    },
    onError: (err) => {
      toast.error(err.message || "Errore nell'aggiornamento del logo");
    },
  });
  
  const canEditTeam = user && (user.role === "staff" || user.role === "ceo" || user.role === "admin");
  
  const handleLogoSubmit = async () => {
    if (!logoUrl.trim()) {
      toast.error("Inserisci un URL valido");
      return;
    }
    setUploading(true);
    try {
      await updateLogoMutation.mutateAsync({ id: teamId, logoUrl: logoUrl.trim() });
    } finally {
      setUploading(false);
    }
  };

  if (loadingTeam) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16">
        <div className="container">
          <div className="shimmer h-48 rounded-xl mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-700 text-foreground mb-2">Team Not Found</h2>
          <button onClick={() => window.history.back()} className="text-primary hover:underline font-sans">← Back to Teams</button>
        </div>
      </div>
    );
  }

  const kd = team.losses === 0 ? team.wins : (team.wins / team.losses).toFixed(2);
  const total = team.wins + team.losses;
  const winRate = total === 0 ? 0 : Math.round((team.wins / total) * 100);

  // Calculate weekly stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyMatches = matchHistory?.filter((m: any) => new Date(m.createdAt) >= weekAgo) ?? [];
  const weeklyWins = weeklyMatches.filter((m: any) => m.winnerId === teamId).length;
  const weeklyLosses = weeklyMatches.filter((m: any) => m.loserId === teamId).length;
  const weeklyTotal = weeklyWins + weeklyLosses;
  const weeklyWinRate = weeklyTotal === 0 ? 0 : Math.round((weeklyWins / weeklyTotal) * 100);
  const weeklyEloChange = weeklyMatches.reduce((sum: number, m: any) => {
    return sum + (m.winnerId === teamId ? m.eloChange : -m.eloChange);
  }, 0);

  // Prepare chart data
  const chartData = eloHistory?.map((entry: any, i: number) => ({
    index: i + 1,
    elo: entry.elo,
    date: new Date(entry.recordedAt).toLocaleDateString("it-IT"),
  })) ?? [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="card-premium px-3 py-2 text-sm">
          <p className="font-display font-700 text-secondary">{payload[0].value} ELO</p>
          <p className="text-muted-foreground text-xs">{payload[0].payload.date}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container">
        {/* Back */}
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-sans text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </button>

        {/* Team Hero */}
        <div className="card-premium border-animated p-6 md:p-8 mb-6 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.60 0.22 290), transparent)", transform: "translate(30%, -30%)" }} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center flex-shrink-0 glow-purple overflow-hidden">
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-display font-900 text-primary">{team.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {canEditTeam && (
                <button
                  onClick={() => setShowLogoInput(!showLogoInput)}
                  className="absolute -bottom-2 -right-2 bg-primary hover:bg-primary/90 text-background p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                  title="Aggiungi/Modifica logo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-display font-900 text-foreground">{team.name}</h1>
                {teamRank >= 0 && <TierBadge rank={teamRank + 1} />}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-2xl font-display font-800 text-secondary text-glow-gold">{team.elo} <span className="text-sm text-muted-foreground font-500">ELO</span></span>
                <StreakBadge streak={team.streak} />
              </div>
            </div>
            {/* Win rate */}
            <div className="flex-shrink-0 text-right">
              <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">Win Rate</p>
              <p className="text-3xl font-display font-900 text-foreground">{winRate}%</p>
              <div className="w-32 mt-2">
                <WinRateBar wins={team.wins} losses={team.losses} />
              </div>
            </div>
          </div>
        </div>

        {/* Logo Upload Form */}
        {showLogoInput && canEditTeam && (
          <div className="card-premium p-4 mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-primary" />
              <h3 className="font-display font-700 text-foreground">Aggiungi/Modifica Logo</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Incolla URL immagine..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
              <button
                onClick={handleLogoSubmit}
                disabled={uploading}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted text-background rounded-lg font-sans font-600 transition-all flex items-center gap-2"
              >
                {uploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Caricamento..." : "Salva"}
              </button>
            </div>
          </div>
        )}

        {/* Weekly Stats */}
        <div className="card-premium p-6 mb-6 animate-fade-in-up relative overflow-hidden border-animated">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.60 0.22 290), transparent)", transform: "translate(30%, -30%)" }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-display tracking-widest text-secondary uppercase mb-1">Last 7 Days</p>
                <h3 className="text-xl font-display font-800 text-foreground">WEEKLY STATS</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">Elo Trend</p>
                <p className={`text-2xl font-display font-800 ${weeklyEloChange >= 0 ? 'text-win' : 'text-loss'}`}>
                  {weeklyEloChange >= 0 ? '+' : ''}{weeklyEloChange}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="card-premium p-4">
                <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Matches</p>
                <p className="text-2xl font-display font-800 text-foreground">{weeklyTotal}</p>
              </div>
              <div className="card-premium p-4">
                <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Win Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-800 text-foreground">{weeklyWinRate}%</p>
                </div>
              </div>
              <div className="card-premium p-4">
                <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Record</p>
                <p className="text-2xl font-display font-800 text-foreground">{weeklyWins}W-{weeklyLosses}L</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: "Wins", value: team.wins, icon: <Trophy className="w-5 h-5" />, color: "text-win", accent: "green" as const },
            { label: "Losses", value: team.losses, icon: <TrendingDown className="w-5 h-5" />, color: "text-loss", accent: "red" as const },
            { label: "K/D Ratio", value: kd, icon: <Swords className="w-5 h-5" />, color: "text-secondary", accent: "gold" as const },
            { label: "Streak", value: team.streak > 0 ? `+${team.streak}W` : team.streak < 0 ? `${Math.abs(team.streak)}L` : "—", icon: <Flame className="w-5 h-5" />, color: team.streak > 0 ? "text-win" : "text-loss", accent: "purple" as const },
            { label: "Best Streak", value: `${team.bestStreak}W`, icon: <Star className="w-5 h-5" />, color: "text-secondary", accent: "gold" as const },
            { label: "Freeroam W/L", value: `${team.freeroamWins}/${team.freeroamLosses}`, icon: <Shield className="w-5 h-5" />, color: "text-foreground", accent: "purple" as const },
          ].map(({ label, value, icon, color, accent }, i) => (
            <div key={label} className={`card-premium p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
              <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">{label}</p>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-display font-800 ${color}`}>{value}</p>
                <div className={`p-1.5 rounded-lg bg-${accent === "green" ? "green-500" : accent === "red" ? "red-500" : accent === "gold" ? "secondary" : "primary"}/10 text-${accent === "green" ? "win" : accent === "red" ? "loss" : accent === "gold" ? "secondary" : "primary"}`}>
                  {icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Elo Chart */}
        <div className="card-premium p-6 mb-6 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-display tracking-widest text-primary uppercase mb-1">Progression</p>
              <h3 className="text-xl font-display font-800 text-foreground">ELO HISTORY</h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-display text-muted-foreground">
              <div className="w-3 h-0.5 rounded-full bg-primary" />
              Elo over time
            </div>
          </div>
          {loadingElo || chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              {loadingElo ? (
                <div className="shimmer w-full h-full rounded-lg" />
              ) : (
                <p className="text-muted-foreground font-sans text-sm">No Elo history available yet.</p>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.60 0.22 290)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.60 0.22 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0.03 280)" />
                <XAxis dataKey="index" tick={{ fill: "oklch(0.55 0.02 280)", fontSize: 11, fontFamily: "Orbitron" }} />
                <YAxis tick={{ fill: "oklch(0.55 0.02 280)", fontSize: 11, fontFamily: "Orbitron" }} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={1500} stroke="oklch(0.75 0.16 75)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="elo"
                  stroke="oklch(0.60 0.22 290)"
                  strokeWidth={2}
                  fill="url(#eloGrad)"
                  dot={{ fill: "oklch(0.60 0.22 290)", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "oklch(0.75 0.16 75)", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Match History */}
        <div className="card-premium overflow-hidden animate-fade-in-up delay-300">
          <div className="px-6 py-4 border-b border-border/50">
            <p className="text-xs font-display tracking-widest text-primary uppercase mb-1">History</p>
            <h3 className="text-xl font-display font-800 text-foreground">MATCH HISTORY</h3>
          </div>
          {loadingMatches ? (
            <div className="p-5"><TableSkeleton rows={5} /></div>
          ) : matchHistory?.length === 0 ? (
            <div className="py-16 text-center">
              <Swords className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-sans">No matches played yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[60px_1fr_1fr_80px_100px] gap-3 px-5 py-3 border-b border-border/30 bg-muted/20">
                {["ID", "Winner", "Loser", "Elo Δ", "Date"].map((h, i) => (
                  <span key={i} className={`text-xs font-display tracking-widest text-muted-foreground uppercase ${i >= 3 ? "text-right" : ""}`}>{h}</span>
                ))}
              </div>
              {matchHistory?.map((match: any, i: number) => {
                const isWinner = match.winnerId === teamId;
                return (
                  <div key={match.id} className="grid grid-cols-[60px_1fr_1fr_80px_100px] gap-3 px-5 py-4 border-b border-border/20 last:border-0 table-row-hover animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}>
                    <span className="text-xs font-display text-muted-foreground flex items-center">#{match.id}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      {isWinner && <Trophy className="w-3.5 h-3.5 text-secondary flex-shrink-0" />}
                      <span className={`font-display font-700 truncate ${isWinner ? "text-win" : "text-muted-foreground"}`}>{match.winnerName}</span>
                    </div>
                    <div className="flex items-center min-w-0">
                      <span className={`font-display font-700 truncate ${!isWinner ? "text-loss" : "text-muted-foreground"}`}>{match.loserName}</span>
                    </div>
                    <div className="flex items-center justify-end">
                      <EloChange change={match.eloChange} isWinner={isWinner} />
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground font-sans">{new Date(match.createdAt).toLocaleDateString("it-IT")}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
