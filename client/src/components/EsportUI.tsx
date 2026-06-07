import { TrendingUp, TrendingDown, Minus, Crown, Flame, Zap } from "lucide-react";

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: "purple" | "gold" | "green" | "red";
  className?: string;
}

export function StatCard({ label, value, icon, accent = "purple", className = "" }: StatCardProps) {
  const accentColors = {
    purple: "text-primary border-primary/30 bg-primary/10",
    gold:   "text-secondary border-secondary/30 bg-secondary/10",
    green:  "text-win border-green-500/30 bg-green-500/10",
    red:    "text-loss border-red-500/30 bg-red-500/10",
  };
  return (
    <div className={`card-premium p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">{label}</p>
          <p className="text-3xl font-display font-800 text-foreground">{value}</p>
        </div>
        {icon && (
          <div className={`p-2 rounded-lg border ${accentColors[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Elo Badge ────────────────────────────────────────────────────────────────
export function EloBadge({ elo }: { elo: number }) {
  const tier = elo >= 2000 ? "LEGEND" : elo >= 1800 ? "MASTER" : elo >= 1600 ? "DIAMOND" : elo >= 1400 ? "GOLD" : elo >= 1200 ? "SILVER" : "BRONZE";
  const colors: Record<string, string> = {
    LEGEND:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MASTER:  "bg-purple-500/20 text-purple-300 border-purple-500/40",
    DIAMOND: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    GOLD:    "bg-amber-500/20 text-amber-400 border-amber-500/40",
    SILVER:  "bg-slate-400/20 text-slate-300 border-slate-400/40",
    BRONZE:  "bg-orange-700/20 text-orange-400 border-orange-700/40",
  };
  return (
    <span className={`stat-badge border ${colors[tier]}`}>{tier}</span>
  );
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/20 border border-secondary/50 rank-1 font-display font-900 text-sm">
      <Crown className="w-4 h-4" />
    </span>
  );
  if (rank === 2) return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/10 border border-slate-400/30 rank-2 font-display font-900 text-sm">{rank}</span>
  );
  if (rank === 3) return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-700/10 border border-orange-700/30 rank-3 font-display font-900 text-sm">{rank}</span>
  );
  return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground font-display font-700 text-sm">{rank}</span>
  );
}

// ─── Elo Change ───────────────────────────────────────────────────────────────
export function EloChange({ change, isWinner }: { change: number; isWinner: boolean }) {
  if (isWinner) return (
    <span className="flex items-center gap-1 text-win font-display font-700 text-sm">
      <TrendingUp className="w-3.5 h-3.5" />+{change}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-loss font-display font-700 text-sm">
      <TrendingDown className="w-3.5 h-3.5" />-{change}
    </span>
  );
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return <span className="text-muted-foreground text-sm">—</span>;
  if (streak > 0) return (
    <span className="flex items-center gap-1 stat-badge bg-win/10 text-win border border-win/30">
      <Flame className="w-3 h-3" />{streak}W
    </span>
  );
  return (
    <span className="flex items-center gap-1 stat-badge bg-loss/10 text-loss border border-loss/30">
      <Zap className="w-3 h-3" />{Math.abs(streak)}L
    </span>
  );
}

// ─── KD Ratio ─────────────────────────────────────────────────────────────────
export function KdRatio({ wins, losses }: { wins: number; losses: number }) {
  const kd = losses === 0 ? wins : wins / losses;
  const formatted = kd.toFixed(2);
  const color = kd >= 2 ? "text-win" : kd >= 1 ? "text-secondary" : "text-loss";
  return <span className={`font-display font-700 ${color}`}>{formatted}</span>;
}

// ─── Win Rate Bar ─────────────────────────────────────────────────────────────
export function WinRateBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const rate = total === 0 ? 0 : Math.round((wins / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${rate}%`,
            background: rate >= 60
              ? "oklch(0.70 0.20 140)"
              : rate >= 40
              ? "oklch(0.75 0.16 75)"
              : "oklch(0.60 0.22 25)",
          }}
        />
      </div>
      <span className="text-xs font-display font-700 text-muted-foreground w-10 text-right">{rate}%</span>
    </div>
  );
}

// ─── Live Indicator ───────────────────────────────────────────────────────────
export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="pulse-dot" />
      <span className="text-xs font-display tracking-widest text-primary uppercase">Live</span>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, accent }: { title: string; subtitle?: string; accent?: string }) {
  return (
    <div className="mb-8">
      {accent && (
        <p className="text-xs font-display tracking-widest text-primary uppercase mb-2">{accent}</p>
      )}
      <h2 className="text-2xl md:text-3xl font-display font-800 text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-1 font-sans">{subtitle}</p>}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="shimmer h-14 rounded-lg" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return <div className="shimmer h-28 rounded-xl" />;
}
