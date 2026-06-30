import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Trophy, Swords, Users, TrendingUp, ChevronRight, Zap, Shield } from "lucide-react";
import { StatCard, RankBadge, EloBadge, StreakBadge, KdRatio, LiveIndicator, TableSkeleton, CardSkeleton } from "@/components/EsportUI";

export default function Home() {
  const { data: top10, isLoading: loadingLb } = trpc.leaderboard.byElo.useQuery({ limit: 10 }, { refetchInterval: 15000 });
  const { data: stats, isLoading: loadingStats } = trpc.stats.global.useQuery(undefined, { refetchInterval: 15000 });

  return (
    <div className="min-h-screen bg-hero bg-grid">
      {/* Hero */}
      <section className="pt-32 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(ellipse, oklch(0.55 0.25 250), transparent)" }} />
        </div>
        <div className="container relative z-10">
          <div className="inline-flex items-center justify-center mb-6 animate-fade-in">
            <div className="h-24 w-24 bg-cover bg-center" style={{backgroundImage: 'url(https://i.postimg.cc/dV1szdFg/B0E7C9B8-C7D7-41F7-BE47-562605946559.png)'}} />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-900 mb-4 animate-fade-in-up delay-100">
            <span className="text-azure-bright">VANQUEST</span>
            <br />
            <span className="text-foreground">PRO LEAGUE</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-sans max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-up delay-300">
            <Link href="/leaderboard">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
                <Trophy className="w-4 h-4" />
                VIEW LEADERBOARD
              </button>
            </Link>
            <Link href="/teams">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm border border-border hover:border-primary/50 text-foreground hover:bg-accent transition-all">
                <Users className="w-4 h-4" />
                ALL TEAMS
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Global Stats */}
      <section className="py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loadingStats ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                <div className="animate-fade-in-up delay-100">
                  <StatCard
                    label="Campione Attuale"
                    value={stats?.champion?.name ?? "—"}
                    icon={<Trophy className="w-5 h-5" />}
                    accent="blue"
                  />
                </div>
                <div className="animate-fade-in-up delay-150">
                  <StatCard
                    label="Giocatori Registrati"
                    value={stats?.totalPlayers ?? 0}
                    icon={<Users className="w-5 h-5" />}
                    accent="azure"
                  />
                </div>
                <div className="animate-fade-in-up delay-200">
                  <StatCard
                    label="Match Ultime 24h"
                    value={stats?.matches24h ?? 0}
                    icon={<Swords className="w-5 h-5" />}
                    accent="green"
                  />
                </div>
                <div className="animate-fade-in-up delay-300">
                  <StatCard
                    label="Team Più in Forma"
                    value={stats?.bestStreakTeam?.name ?? "—"}
                    icon={<TrendingUp className="w-5 h-5" />}
                    accent="blue"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Top 10 Leaderboard */}
      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-display tracking-widest text-primary uppercase mb-1">Rankings</p>
              <h2 className="text-2xl md:text-3xl font-display font-800 text-foreground">TOP 10 TEAMS</h2>
            </div>
            <div className="flex items-center gap-4">
              <LiveIndicator />
              <Link href="/leaderboard">
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-sans">
                  Full Leaderboard <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          <div className="card-premium overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_100px_80px_80px_80px_100px] gap-3 px-4 py-3 border-b border-border/50">
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">#</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Team</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase text-right">Elo</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase text-right hidden sm:block">W</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase text-right hidden sm:block">L</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase text-right hidden md:block">K/D</span>
              <span className="text-xs font-display tracking-widest text-muted-foreground uppercase text-right hidden md:block">Streak</span>
            </div>

            {/* Table rows */}
            {loadingLb ? (
              <div className="p-4"><TableSkeleton rows={10} /></div>
            ) : top10?.length === 0 ? (
              <div className="py-16 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-sans">No teams registered yet.</p>
              </div>
            ) : (
              top10?.map((team, i) => (
                <Link key={team.id} href={`/team/${team.id}`}>
                  <div className={`grid grid-cols-[40px_1fr_100px_80px_80px_80px_100px] gap-3 px-4 py-4 border-b border-border/30 last:border-0 table-row-hover cursor-pointer animate-fade-in-up`}
                    style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center">
                      <RankBadge rank={i + 1} />
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-display font-800 text-primary">{team.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-700 text-foreground truncate">{team.name}</p>
                        <div className="hidden sm:block">
                          <EloBadge elo={team.elo} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="font-display font-800 text-secondary text-glow-gold">{team.elo}</span>
                    </div>
                    <div className="hidden sm:flex items-center justify-end">
                      <span className="font-display font-700 text-win">{team.wins}</span>
                    </div>
                    <div className="hidden sm:flex items-center justify-end">
                      <span className="font-display font-700 text-loss">{team.losses}</span>
                    </div>
                    <div className="hidden md:flex items-center justify-end">
                      <KdRatio wins={team.wins} losses={team.losses} />
                    </div>
                    <div className="hidden md:flex items-center justify-end">
                      <StreakBadge streak={team.streak} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Matches */}
      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-display tracking-widest text-primary uppercase mb-1">Latest</p>
              <h2 className="text-2xl md:text-3xl font-display font-800 text-foreground">FREEROAM RECENTI</h2>
            </div>
            <Link href="/matches">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-sans">
                All Matches <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {loadingStats ? (
            <div className="space-y-3"><TableSkeleton rows={5} /></div>
          ) : stats?.recentMatches?.length === 0 ? (
            <div className="card-premium py-16 text-center">
              <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-sans">No matches played yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.recentMatches?.map((match, i) => (
                <div key={match.id} className={`card-premium px-4 py-4 flex items-center gap-4 animate-fade-in-up`}
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="text-xs font-display text-muted-foreground w-12 flex-shrink-0">#{match.id}</span>
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {match.winnerLogoUrl && <img src={match.winnerLogoUrl} alt="" className="w-6 h-6 rounded flex-shrink-0" />}
                      <Trophy className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span className="font-display font-700 text-foreground truncate">{match.winnerName}</span>
                    </div>
                    <span className="text-muted-foreground text-xs font-display flex-shrink-0">VS</span>
                    <div className="flex items-center gap-2 min-w-0">
                      {match.loserLogoUrl && <img src={match.loserLogoUrl} alt="" className="w-6 h-6 rounded flex-shrink-0" />}
                      <span className="font-display font-500 text-muted-foreground truncate">{match.loserName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-win font-display font-700 text-sm">+{match.eloChange}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(match.createdAt).toLocaleDateString("it-IT")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 mt-8">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="w-5 h-5 text-primary" />
            <span className="font-display font-700 tracking-widest text-azure-bright">VANQUEST PRO LEAGUE</span>
          </div>
          <p className="text-xs text-muted-foreground font-sans">Created by @kayronfpss1.</p>
        </div>
      </footer>
    </div>
  );
}
