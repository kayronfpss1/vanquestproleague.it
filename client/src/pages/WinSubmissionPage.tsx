import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function WinSubmissionPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: userFactionMembers } = trpc.factions.getUserFactions.useQuery(undefined, { enabled: !!user });
  const { data: allFactions } = trpc.factions.list.useQuery();

  const createSubmission = trpc.winSubmissions.create.useMutation({
    onSuccess: () => {
      toast.success("Win submission inviata! In attesa di approvazione dello staff.");
      setScreenshotUrl("");
    },
    onError: (e: any) => toast.error(e.message || "Errore nell'invio della win"),
  });

  // Auth gate
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
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">LOGIN REQUIRED</h2>
          <p className="text-muted-foreground font-sans mb-8">Devi essere registrato per inviare una win.</p>
          <a href="/login">
            <button className="w-full px-6 py-3 rounded-xl font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
              LOGIN
            </button>
          </a>
        </div>
      </div>
    );
  }

  if (!userFactionMembers || userFactionMembers.length === 0) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">NO FACTION</h2>
          <p className="text-muted-foreground font-sans">Devi essere assegnato a una fazione per inviare una win. Contatta lo staff.</p>
        </div>
      </div>
    );
  }

  const userFactionMember = userFactionMembers?.[0];
  const userFaction = userFactionMember ? allFactions?.find(f => f.id === userFactionMember.factionId) : null;

  if (!userFaction) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">FACTION NOT FOUND</h2>
          <p className="text-muted-foreground font-sans">La tua fazione non è stata trovata. Contatta lo staff.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotUrl.trim()) {
      toast.error("Inserisci il link dello screenshot");
      return;
    }
    setIsSubmitting(true);
    try {
      await createSubmission.mutateAsync({
        winnerFactionId: userFaction.id,
        loserFactionId: 0, // Staff selezionerà la fazione perdente
        screenshotUrl: screenshotUrl.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container max-w-2xl">
        <div className="card-premium p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-800 text-foreground">ASSEGNAZIONE WIN</h1>
              <p className="text-sm text-muted-foreground">Invia lo screenshot della tua vittoria</p>
            </div>
          </div>

          {/* Faction Info */}
          <div className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="font-display font-600 text-foreground">TUA FAZIONE</span>
            </div>
            <p className="text-lg font-display font-700 text-primary">{userFaction.name}</p>
            {userFaction.description && (
              <p className="text-sm text-muted-foreground mt-2">{userFaction.description}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-display font-600 text-foreground mb-2">
                LINK SCREENSHOT
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-secondary/20 border border-secondary/30 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Carica lo screenshot su un servizio di hosting (imgur, discord, etc.) e incolla il link qui.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm text-muted-foreground">
                ℹ️ <strong>Lo staff</strong> verificherà lo screenshot e selezionerà la fazione perdente. Una volta approvata, la win sarà registrata automaticamente.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || createSubmission.isPending}
              className="w-full px-6 py-3 rounded-lg font-display font-700 tracking-widest text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || createSubmission.isPending ? "INVIO IN CORSO..." : "✓ INVIA WIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
