import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { User, Lock, LogOut, Camera, Trophy, Swords, X, Check } from "lucide-react";
import { toast } from "sonner";

export default function UserProfile() {
  const { user, isAuthenticated, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState("");

  // Mock stats for now
  const userStats = {
    totalMatches: 0,
    wins: 0,
    losses: 0,
  };

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  // ─── Auth gate ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-grid pt-24 flex items-center justify-center">
        <div className="shimmer w-64 h-12 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">LOGIN REQUIRED</h2>
          <p className="text-muted-foreground font-sans mb-8">You must be logged in to view your profile.</p>
          <a href={getLoginUrl()}>
            <button className="w-full px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
              LOGIN TO CONTINUE
            </button>
          </a>
        </div>
      </div>
    );
  }

  const winRate = userStats?.totalMatches && userStats.totalMatches > 0
    ? Math.round((userStats.wins / userStats.totalMatches) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container max-w-2xl">
        {/* Main Profile Card */}
        <div className="card-premium overflow-hidden animate-fade-in-up">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 border-b border-border/50 relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-24 h-24 rounded-full blur-2xl bg-primary" />
              <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full blur-3xl bg-secondary" />
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pb-8 relative">
            {/* Avatar Section */}
            <div className="flex flex-col items-center -mt-20 mb-8">
              <div className="relative mb-6">
                <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 border-4 border-border flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || "Profile"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-20 h-20 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="absolute bottom-2 right-2 p-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                <h1 className="text-4xl md:text-5xl font-display font-900 text-foreground mb-2">
                  {user.name || user.username || "Player"}
                </h1>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-display font-600 text-sm">
                    USER
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 font-display font-600 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
              </div>

            {/* Faction Info */}
            {/* Faction info would go here if user type included faction */}
            </div>

            {/* Edit Avatar Section */}
            {isEditing && (
              <div className="mb-8 p-6 rounded-xl bg-secondary/10 border border-secondary/20 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-700 text-foreground">MODIFICA FOTO PROFILO</h3>
                </div>
                <input
                  type="url"
                  placeholder="Incolla link immagine avatar (https://...)"
                  value={tempAvatarUrl}
                  onChange={(e) => setTempAvatarUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAvatarUrl(tempAvatarUrl);
                      setIsEditing(false);
                      toast.success("Profile picture updated!");
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-display font-600 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    SALVA
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setTempAvatarUrl(avatarUrl);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-foreground font-display font-600 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    ANNULLA
                  </button>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Matches */}
              <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/20 text-center hover:border-secondary/40 transition-all">
                <div className="flex justify-center mb-3">
                  <Swords className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-2">PARTITE</p>
                <p className="text-3xl font-display font-900 text-foreground">{userStats?.totalMatches || 0}</p>
              </div>

              {/* Wins */}
              <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/20 text-center hover:border-secondary/40 transition-all">
                <div className="flex justify-center mb-3">
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-2">VITTORIE</p>
                <p className="text-3xl font-display font-900 text-green-400">{userStats?.wins || 0}</p>
              </div>

              {/* Losses */}
              <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/20 text-center hover:border-secondary/40 transition-all">
                <div className="flex justify-center mb-3">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-2">SCONFITTE</p>
                <p className="text-3xl font-display font-900 text-red-400">{userStats?.losses || 0}</p>
              </div>

              {/* Win Rate */}
              <div className="p-6 rounded-xl bg-secondary/10 border border-secondary/20 text-center hover:border-secondary/40 transition-all">
                <div className="flex justify-center mb-3">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-2">WIN RATE</p>
                <p className="text-3xl font-display font-900 text-amber-400">{winRate}%</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="flex-1 px-6 py-3 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive font-display font-700 tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                {logout.isPending ? "LOGGING OUT..." : "LOGOUT"}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-6 rounded-xl bg-secondary/10 border border-secondary/20 animate-fade-in-up delay-100">
          <p className="text-sm text-muted-foreground font-sans">
            <span className="font-display font-600 text-foreground">💡 Tip:</span> Completa il tuo profilo con una foto per apparire più professionale nella community!
          </p>
        </div>
      </div>
    </div>
  );
}
