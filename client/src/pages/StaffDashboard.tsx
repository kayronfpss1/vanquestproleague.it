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

type Tab = "teams" | "matches" | "logs" | "factions" | "wins";

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

  const validRoles = ["staff", "ceo", "admin"];
  if (!validRoles.includes(user?.role || "")) {
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
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display font-600 text-sm tracking-widest whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-secondary/30 text-secondary border border-secondary/50"
                    : "bg-secondary/10 text-muted-foreground hover:bg-secondary/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "wins" && <WinSubmissions />}
      </div>
    </div>
  );
}

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
              const loserFaction = factions?.find(f => f.id === selectedLoserFaction[sub.id]);
              
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

                  {/* Loser Faction Dropdown */}
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

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!selectedLoserFaction[sub.id]) {
                          toast.error("Please select the loser faction");
                          return;
                        }
                        approveWin.mutate({ 
                          submissionId: sub.id,
                          loserFactionId: selectedLoserFaction[sub.id]
                        });
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
