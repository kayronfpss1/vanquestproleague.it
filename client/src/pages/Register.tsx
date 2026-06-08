import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Register() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.customAuth.register.useMutation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      toast.error("Compila tutti i campi");
      return;
    }

    setLoading(true);
    try {
      await registerMutation.mutateAsync({ username, email, password });
      toast.success("Account creato! Accedi ora.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Errore nella registrazione");
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
          <p className="text-purple-300/60 text-sm mb-6">Crea il tuo account</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-purple-300 block mb-2">Username</label>
              <Input
                type="text"
                placeholder="kayronfpss1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-purple-950/30 border-purple-500/30 text-white placeholder:text-purple-400/50"
                disabled={loading}
              />
              <p className="text-xs text-purple-400/50 mt-1">3-30 caratteri, lettere, numeri e underscore</p>
            </div>

            <div>
              <label className="text-sm text-purple-300 block mb-2">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <p className="text-xs text-purple-400/50 mt-1">Minimo 6 caratteri</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white font-bold py-2 rounded-lg transition-all duration-300"
            >
              {loading ? "Registrazione in corso..." : "Registrati"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-500/20">
            <p className="text-purple-300/60 text-sm text-center">
              Hai già un account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-purple-400 hover:text-yellow-400 transition-colors"
              >
                Accedi
              </button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
