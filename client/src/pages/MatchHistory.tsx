import { trpc } from "@/lib/trpc";
import { Swords, Trophy, TrendingUp, TrendingDown, Search } from "lucide-react";
import { useState } from "react";
import { TableSkeleton, LiveIndicator } from "@/components/EsportUI";
import { Link } from "wouter";

export default function MatchHistory() {
  const [search, setSearch] = useState("");
  const { data: matches, isLoading } = trpc.matches.list.useQuery();

  const filtered = matches?.filter(m =>
    m.winnerName.toLowerCase().includes(search.toLowerCase()) ||
    m.loserName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <LiveIndicator />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-900 text-foreground mb-2">MATCH HISTORY</h1>
          <p className="text-muted-foreground font-sans">Complete record of all tournament matches and Elo changes.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6 animate-fade-in-up delay-100">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by team name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground font-sans transition-all"
          />
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6 animate-fade-in-up delay-150">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-700 text-foreground">{matches?.length ?? 0} <span className="text-muted-foreground font-500">total matches</span></span>
          </div>
          {search && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-display font-700 text-secondary">{filtered.length} <span className="text-muted-foreground font-500">results</span></span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card-premium overflow-hidden animate-fade-in-up delay-200">
          <div className="grid grid-cols-[60px_1fr_1fr_90px_90px_110px] gap-3 px-5 py-3 border-b border-border/50 bg-muted/20">
            {["ID", "Winner", "Loser", "Elo +/-", "Elo Before", "Date"].map((h, i) => (
              <span key={i} className={`text-xs font-display tracking-widest text-muted-foreground uppercase ${i >= 3 ? "text-right" : ""} ${i === 4 ? "hidden lg:block" : ""}`}>{h}</span>
            ))}
          </div>

          {isLoading ? (
            <div className="p-5"><TableSkeleton rows={10} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Swords className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-sans text-lg">
                {search ? "No matches found for this search." : "No matches played yet."}
              </p>
            </div>
          ) : (
            filtered.map((match, i) => (
              <div key={match.id}
                className="grid grid-cols-[60px_1fr_1fr_90px_90px_110px] gap-3 px-5 py-4 border-b border-border/20 last:border-0 table-row-hover animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}>

                {/* ID */}
                <div className="flex items-center">
                  <span className="text-xs font-display text-muted-foreground">#{match.id}</span>
                </div>

                {/* Winner */}
                <Link href={`/team/${match.winnerId}`}>
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer group">
                    <Trophy className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                    <span className="font-display font-700 text-win truncate group-hover:text-secondary transition-colors">{match.winnerName}</span>
                  </div>
                </Link>

                {/* Loser */}
                <Link href={`/team/${match.loserId}`}>
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer group">
                    <span className="font-display font-500 text-muted-foreground truncate group-hover:text-foreground transition-colors">{match.loserName}</span>
                  </div>
                </Link>

                {/* Elo change */}
                <div className="flex items-center justify-end gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1 text-win font-display font-700 text-xs">
                      <TrendingUp className="w-3 h-3" />+{match.eloChange}
                    </span>
                    <span className="flex items-center gap-1 text-loss font-display font-700 text-xs">
                      <TrendingDown className="w-3 h-3" />-{match.eloChange}
                    </span>
                  </div>
                </div>

                {/* Elo before */}
                <div className="hidden lg:flex flex-col items-end justify-center gap-0.5">
                  <span className="text-xs text-muted-foreground font-display">{match.winnerEloBefore} → {match.winnerEloBefore + match.eloChange}</span>
                  <span className="text-xs text-muted-foreground/60 font-display">{match.loserEloBefore} → {match.loserEloBefore - match.eloChange}</span>
                </div>

                {/* Date */}
                <div className="flex items-center justify-end">
                  <span className="text-xs text-muted-foreground font-sans">{new Date(match.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
