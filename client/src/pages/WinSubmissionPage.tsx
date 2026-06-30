import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Trophy, Upload, Lock, AlertTriangle } from "lucide-react";

export default function WinSubmissionPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's faction (they can only submit for their own faction)
  const { data: userFactions } = trpc.factions.getUserFactions.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const userFaction = userFactions?.[0]; // Get first faction user belongs to

  const submitWin = trpc.winSubmissions.create.useMutation({
    onSuccess: () => {
      toast.success("Win submission sent! Staff will review it shortly.");
      setScreenshotUrl("");
    },
    onError: (e: any) => toast.error(e.message),
  });

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
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">LOGIN REQUIRED</h2>
          <p className="text-muted-foreground font-sans mb-8">You must be logged in to submit a win.</p>
          <a href={getLoginUrl()}>
            <button className="w-full px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
              LOGIN TO CONTINUE
            </button>
          </a>
        </div>
      </div>
    );
  }

  // Check if user is part of any faction
  if (!userFaction) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">NOT IN A FACTION</h2>
          <p className="text-muted-foreground font-sans">You must be assigned to a faction by staff to submit wins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-display tracking-widest text-primary uppercase">Submit Win</p>
              <h1 className="text-3xl md:text-4xl font-display font-900 text-foreground">ASSEGNAZIONE WIN</h1>
            </div>
          </div>
          <p className="text-muted-foreground font-sans">Submit your faction's win with a screenshot for staff approval.</p>
        </div>

        {/* Form */}
        <div className="card-premium p-8 animate-fade-in-up delay-100">
          <div className="space-y-6">
            {/* Your Faction Info */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-display font-600 text-foreground mb-1">YOUR FACTION (WINNER)</p>
              <p className="text-2xl font-display font-900 text-primary">{userFaction.name}</p>
            </div>

            {/* Screenshot URL */}
            <div>
              <label className="block text-sm font-display font-600 text-foreground mb-2">SCREENSHOT</label>
              <input
                type="url"
                placeholder="https://example.com/screenshot.png"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">Upload your screenshot to an image hosting service and paste the URL here. Staff will identify the opponent faction from the screenshot.</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                if (!screenshotUrl) {
                  toast.error("Please provide a screenshot URL");
                  return;
                }
                setIsSubmitting(true);
                submitWin.mutate(
                  {
                    winnerFactionId: userFaction.id,
                    screenshotUrl,
                  },
                  {
                    onSettled: () => setIsSubmitting(false),
                  }
                );
              }}
              disabled={!screenshotUrl || isSubmitting || submitWin.isPending}
              className="w-full px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-display font-700 tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {isSubmitting || submitWin.isPending ? "SUBMITTING..." : "SUBMIT WIN"}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-display font-600 text-foreground">📋 Info:</span> After submission, staff will review your screenshot, identify the opponent faction, and approve or reject the win. Once approved, ELO will be automatically updated for both factions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
