import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Users, Trophy, Search } from "lucide-react";
import { useState } from "react";
import { EloBadge, KdRatio, StreakBadge, WinRateBar, TableSkeleton } from "@/components/EsportUI";

export default function Teams() {
  const [search, setSearch] = useState("");
  const { data: teams, isLoading } = trpc.teams.list.useQuery();

  const filtered = teams?.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <p className="text-xs font-display tracking-widest text-azure-bright uppercase mb-2">Roster</p>
          <h1 className="text-4xl md:text-5xl font-display font-900 text-foreground mb-2">VANQUEST TEAMS</h1>
          <p className="text-muted-foreground font-sans">Browse all registered teams and their statistics.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 animate-fade-in-up delay-100">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground font-sans transition-all"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-48 rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center card-premium">
            <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-sans text-lg">
              {search ? "No teams match your search." : "No teams registered yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((team, i) => (
              <Link key={team.id} href={`/team/${team.id}`}>
                <div className={`card-premium border-animated p-5 cursor-pointer animate-fade-in-up`}
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-display font-900 text-primary">{team.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-800 text-foreground truncate mb-1">{team.name}</h3>
                      <EloBadge elo={team.elo} />
                    </div>
                    <span className="text-xl font-display font-800 text-secondary flex-shrink-0">{team.elo}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">W</p>
                      <p className="text-lg font-display font-800 text-win">{team.wins}</p>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">L</p>
                      <p className="text-lg font-display font-800 text-loss">{team.losses}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">K/D</p>
                      <KdRatio wins={team.wins} losses={team.losses} />
                    </div>
                  </div>

                  <WinRateBar wins={team.wins} losses={team.losses} />

                  <div className="flex items-center justify-between mt-3">
                    <StreakBadge streak={team.streak} />
                    <span className="text-xs text-primary font-sans hover:underline">View Profile →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
