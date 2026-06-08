import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.customAuth.login.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Compila tutti i campi");
      return;
    }

    setLoading(true);
    try {
      await loginMutation.mutateAsync({ identifier, password });
      toast.success("Login effettuato!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Errore nel login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-black/80 border-purple-500/30 backdrop-blur">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-yellow-400 mb-2 font-orbitron">
            FiveM Torneo
          </h1>
          <p className="text-purple-300/60 text-sm mb-6">Accedi al tuo account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-purple-300 block mb-2">Email o Username</label>
              <Input
                type="text"
                placeholder="kayronfpss1 o email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="bg-purple-950/30 border-purple-500/30 text-white placeholder:text-purple-400/50"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm text-purple-300 block mb-2">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-purple-950/30 border-purple-500/30 text-white placeholder:text-purple-400/50"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white font-bold py-2 rounded-lg transition-all duration-300"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-500/20">
            <p className="text-purple-300/60 text-sm text-center">
              Non hai un account?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-purple-400 hover:text-yellow-400 transition-colors"
              >
                Registrati
              </button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
