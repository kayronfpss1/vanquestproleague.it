import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Trophy, CheckCircle, AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const { data: invitation, isLoading: invLoading } = trpc.invitations.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.invitations.use.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      setTimeout(() => setLocation(`/team/${data.teamId}`), 2000);
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      const returnPath = `/invite/${token}`;
      setLocation(`/login?returnPath=${encodeURIComponent(returnPath)}`);
    }
  }, [authLoading, user, token, setLocation]);

  if (authLoading || invLoading) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="shimmer w-20 h-20 rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground font-sans">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-loss mx-auto mb-4" />
          <h2 className="text-2xl font-display font-700 text-foreground mb-2">Invitation Not Found</h2>
          <p className="text-muted-foreground font-sans mb-6">This invitation link is invalid or has expired.</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = new Date() > new Date(invitation.expiresAt);
  const isUsed = !!invitation.usedBy;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-8 max-w-md text-center">
          <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-700 text-foreground mb-2">Invitation Expired</h2>
          <p className="text-muted-foreground font-sans mb-6">This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString("it-IT")}</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (isUsed) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-loss mx-auto mb-4" />
          <h2 className="text-2xl font-display font-700 text-foreground mb-2">Already Used</h2>
          <p className="text-muted-foreground font-sans mb-6">This invitation has already been claimed.</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-8 max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-win mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-display font-700 text-foreground mb-2">Welcome!</h2>
          <p className="text-muted-foreground font-sans mb-2">You've joined <strong>{invitation.teamName}</strong></p>
          <p className="text-sm text-muted-foreground font-sans">Redirecting to team page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid pt-24 pb-16">
      <div className="container max-w-md mx-auto">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-sans text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="card-premium border-animated p-8 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.60 0.22 290), transparent)", transform: "translate(30%, -30%)" }} />
          
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-6 glow-purple">
              <Trophy className="w-8 h-8 text-primary" />
            </div>

            <h1 className="text-3xl font-display font-900 text-foreground mb-2">Join {invitation.teamName}</h1>
            <p className="text-muted-foreground font-sans mb-8">You've been invited to join this team in the Enveart Pro League tournament.</p>

            <div className="bg-muted/20 rounded-lg p-4 mb-8 border border-border/30">
              <p className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Invitation Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-display font-700 text-foreground">{invitation.teamName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-display font-700 text-foreground">{new Date(invitation.expiresAt).toLocaleDateString("it-IT")}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => acceptMutation.mutate({ token: token ?? "" })}
              disabled={acceptMutation.isPending}
              className="w-full mb-3"
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
            </Button>

            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
            >
              Decline
            </Button>

            {acceptMutation.isError && (
              <p className="text-loss text-sm font-sans mt-4">
                Failed to accept invitation. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
