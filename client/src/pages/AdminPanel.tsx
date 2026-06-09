import { trpc } from "@/lib/trpc";
import { Lock, Shield, User, AlertTriangle, Check, X, Copy, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { data: user } = trpc.customAuth.me.useQuery();
  const isAuthenticated = !!user;
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");

  const { data: users, isLoading } = trpc.admin.users.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const setUserRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      trpc.useUtils().admin.users.invalidate();
      setSelectedUser(null);
      toast.success("User role updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = trpc.apiKeys.list.useQuery();
  
  const createApiKey = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      trpc.useUtils().apiKeys.list.invalidate();
      setShowApiKeyForm(false);
      setApiKeyName("");
      if (data && typeof data === 'string') {
        navigator.clipboard.writeText(data);
        toast.success("API Key created and copied to clipboard! Save it now - you won't see it again.");
      } else {
        toast.success("API Key created! Copy it from the list below.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteApiKey = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      trpc.useUtils().apiKeys.list.invalidate();
      toast.success("API Key deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Auth gate ──────────────────────────────────────────────────────────────
  if (!user) {
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
          <p className="text-muted-foreground font-sans mb-8">You must be logged in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-grid pt-24 pb-16 flex items-center justify-center">
        <div className="card-premium p-10 text-center max-w-md w-full animate-scale-in">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-800 text-foreground mb-2">ACCESS DENIED</h2>
          <p className="text-muted-foreground font-sans">Only admins can access this panel.</p>
        </div>
      </div>
    );
  }

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
              <p className="text-xs font-display tracking-widest text-secondary uppercase">Admin Only</p>
              <h1 className="text-3xl md:text-4xl font-display font-900 text-foreground">ADMIN PANEL</h1>
            </div>
          </div>
          <p className="text-muted-foreground font-sans">Manage users, roles, and API keys for integrations.</p>
        </div>

        {/* Users Table */}
        <div className="card-premium overflow-hidden animate-fade-in-up delay-100">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-lg font-display font-700 text-foreground">REGISTERED USERS</h3>
            <span className="text-xs text-muted-foreground font-sans">{users?.length ?? 0} total</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="shimmer h-12 rounded-lg mb-4" />
              <div className="shimmer h-12 rounded-lg mb-4" />
              <div className="shimmer h-12 rounded-lg" />
            </div>
          ) : users?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-sans">No users yet.</div>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_100px_120px] gap-3 px-6 py-3 border-b border-border/30 bg-muted/20">
                <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">User</span>
                <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Email</span>
                <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Role</span>
                <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Action</span>
              </div>

              {/* User rows */}
              {users?.map((u, i) => (
                <div
                  key={u.id}
                  className="grid grid-cols-[1fr_120px_100px_120px] gap-3 px-6 py-4 border-b border-border/20 last:border-0 items-center table-row-hover animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* User name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-700 text-foreground truncate">{u.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">ID: {u.id}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="text-sm text-muted-foreground font-sans truncate">{u.email || "—"}</div>

                  {/* Current role */}
                  <div className="flex items-center justify-center">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-display font-700 tracking-widest ${
                        u.role === "admin"
                          ? "bg-secondary/20 text-secondary border border-secondary/30"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {u.role === "admin" ? "ADMIN" : "USER"}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 justify-end">
                    {selectedUser === u.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setUserRole.mutate({
                              userId: u.id,
                              role: u.role === "admin" ? "user" : "admin",
                            });
                          }}
                          disabled={setUserRole.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/20 text-secondary hover:bg-secondary/30 border border-secondary/30 transition-all text-xs font-display font-700 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {setUserRole.isPending ? "..." : "CONFIRM"}
                        </button>
                        <button
                          onClick={() => setSelectedUser(null)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-accent border border-border transition-all text-xs font-display font-700"
                        >
                          <X className="w-3.5 h-3.5" />
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedUser(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-display font-700 tracking-widest transition-all border ${
                          u.role === "admin"
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30"
                            : "bg-secondary/10 text-secondary hover:bg-secondary/20 border-secondary/30"
                        }`}
                      >
                        {u.role === "admin" ? "DEMOTE" : "PROMOTE"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* API Keys Section */}
        <div className="mt-10 animate-fade-in-up delay-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-display tracking-widest text-primary uppercase">Bot Integration</p>
              <h2 className="text-2xl md:text-3xl font-display font-900 text-foreground">API KEYS</h2>
            </div>
          </div>
          <p className="text-muted-foreground font-sans mb-6">Generate API keys for Discord bot and external integrations.</p>

          {/* API Keys Table */}
          <div className="card-premium overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-700 text-foreground">ACTIVE API KEYS</h3>
              <button
                onClick={() => setShowApiKeyForm(!showApiKeyForm)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 transition-all text-xs font-display font-700"
              >
                <Plus className="w-4 h-4" />
                CREATE
              </button>
            </div>

            {apiKeysLoading ? (
              <div className="p-8 text-center">
                <div className="shimmer h-12 rounded-lg" />
              </div>
            ) : apiKeys?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-sans">No API keys yet. Create one to enable bot integration.</div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_150px_100px] gap-3 px-6 py-3 border-b border-border/30 bg-muted/20">
                  <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Name</span>
                  <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Created</span>
                  <span className="text-xs font-display tracking-widest text-muted-foreground uppercase">Action</span>
                </div>
                {apiKeys?.map((key, i) => (
                  <div
                    key={key.id}
                    className="grid grid-cols-[1fr_150px_100px] gap-3 px-6 py-4 border-b border-border/20 last:border-0 items-center table-row-hover animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-display font-700 text-foreground">{key.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">Key: {key.key.substring(0, 10)}...</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground font-sans">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => deleteApiKey.mutate({ keyId: key.id })}
                      disabled={deleteApiKey.isPending}
                      className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-all text-xs font-display font-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Create API Key Form */}
          {showApiKeyForm && (
            <div className="card-premium p-6 animate-scale-in">
              <h4 className="text-lg font-display font-700 text-foreground mb-4">CREATE NEW API KEY</h4>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Key name (e.g., Discord Bot)"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => createApiKey.mutate({ name: apiKeyName })}
                  disabled={createApiKey.isPending || !apiKeyName.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 border border-primary transition-all text-sm font-display font-700 disabled:opacity-50"
                >
                  {createApiKey.isPending ? "..." : "CREATE"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-sans">The API key will be shown once. Copy it immediately and store it securely.</p>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 rounded-xl bg-secondary/5 border border-secondary/20 animate-fade-in-up delay-200">
          <p className="text-sm text-muted-foreground font-sans">
            <span className="font-display font-700 text-secondary">💡 Tip:</span> Use API keys to authenticate your Discord bot and other integrations. All API key actions are logged automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
