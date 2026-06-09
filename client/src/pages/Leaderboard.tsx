import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Trophy, TrendingUp, Swords, ChevronRight } from "lucide-react";
import { RankBadge, EloBadge, StreakBadge, KdRatio, WinRateBar, LiveIndicator, TableSkeleton } from "@/components/EsportUI";

type Tab = "elo" | "wins" | "kd";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>("elo");

  const { data: byElo, isLoading: loadingElo } = trpc.leaderboard.byElo.useQuery({ limit: 50 }, { refetchInterval: 15000 });
  const { data: byWins, isLoading: loadingWins } = trpc.leaderboard.byWins.useQuery({ limit: 50 }, { refetchInterval: 15000 });
  const { data: byKd, isLoading: loadingKd } = trpc.leaderboard.byKd.useQuery({ limit: 50 }, { refetchInterval: 15000 });

  const tabs = [
    { id: "elo" as Tab, label: "ELO RANKING", icon: Trophy },
    { id: "wins" as Tab, label: "WIN RANKING", icon: TrendingUp },
    { id: "kd" as Tab, label: "K/D RANKING", icon: Swords },
  ];

  const currentData = activeTab === "elo" ? byElo : activeTab === "wins" ? byWins : byKd;
  const isLoading = activeTab === "elo" ? loadingElo : activeTab === "wins" ? loadingWins : loadingKd;

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="pulse-dot" />
            <span className="text-xs font-display tracking-widest text-primary uppercase">Live Rankings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-900 text-foreground mb-2">LEADERBOARD</h1>
          <p className="text-muted-foreground font-sans">Competitive rankings updated in real-time after every match.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap animate-fade-in-up delay-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-700 tracking-widest transition-all duration-200 ${
                activeTab === id
                  ? "bg-primary text-primary-foreground glow-purple"
                  : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card-premium overflow-hidden animate-fade-in-up delay-200">
          {/* Header row */}
          <div className="grid grid-cols-[48px_1fr_100px_70px_70px_90px_120px_100px] gap-3 px-5 py-3 border-b border-border/50 bg-muted/30">
            {["#", "Team", "Elo", "W", "L", "K/D", "Win Rate", "Streak"].map((h, i) => (
              <span key={i} className={`text-xs font-display tracking-widest text-muted-foreground uppercase ${i > 2 ? "text-right" : ""} ${i >= 3 && i <= 4 ? "hidden sm:block" : ""} ${i >= 5 ? "hidden md:block" : ""}`}>{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="p-5"><TableSkeleton rows={10} /></div>
          ) : currentData?.length === 0 ? (
            <div className="py-20 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-sans text-lg">No teams registered yet.</p>
              <p className="text-muted-foreground/60 font-sans text-sm mt-1">Teams will appear here once added by staff.</p>
            </div>
          ) : (
            currentData?.map((team, i) => (
              <Link key={team.id} href={`/team/${team.id}`}>
                <div
                  className="grid grid-cols-[48px_1fr_100px_70px_70px_90px_120px_100px] gap-3 px-5 py-4 border-b border-border/30 last:border-0 table-row-hover cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center"><RankBadge rank={i + 1} /></div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-display font-800 text-primary">{team.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-700 text-foreground truncate">{team.name}</p>
                      <EloBadge elo={team.elo} />
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className={`font-display font-800 text-lg ${activeTab === "elo" ? "text-secondary" : "text-foreground"}`}>{team.elo}</span>
                  </div>

                  <div className="hidden sm:flex items-center justify-end">
                    <span className={`font-display font-700 text-win ${activeTab === "wins" ? "text-lg" : ""}`}>{team.wins}</span>
                  </div>

                  <div className="hidden sm:flex items-center justify-end">
                    <span className="font-display font-700 text-loss">{team.losses}</span>
                  </div>

                  <div className="hidden md:flex items-center justify-end">
                    <KdRatio wins={team.wins} losses={team.losses} />
                  </div>

                  <div className="hidden md:flex items-center justify-end">
                    <WinRateBar wins={team.wins} losses={team.losses} />
                  </div>

                  <div className="hidden md:flex items-center justify-end">
                    <StreakBadge streak={team.streak} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Live indicator */}
        <div className="flex justify-end mt-4">
          <LiveIndicator />
        </div>
      </div>
    </div>
  );
}
