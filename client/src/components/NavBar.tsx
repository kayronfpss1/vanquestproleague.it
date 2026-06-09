import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Menu, X, Trophy, Swords, Users, History, Shield, BarChart3 } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/matches", label: "Match History", icon: History },
];

export default function NavBar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = trpc.customAuth.me.useQuery();
  const isAuthenticated = !!user;
  const logoutMutation = trpc.customAuth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl"
      style={{ background: "oklch(0.07 0.01 280 / 0.92)" }}>
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors" />
              <Swords className="w-5 h-5 text-primary relative z-10" />
            </div>
            <span className="font-display text-lg font-bold tracking-widest text-gold-gradient">
              ENVEART<span className="text-foreground/60 mx-1">|</span>TOURNAMENT
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-600 tracking-wide transition-all duration-200 ${
                  isActive(href)
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <Link href="/staff">
                  <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-600 tracking-wide transition-all duration-200 ${
                    isActive("/staff")
                      ? "bg-secondary/20 text-secondary border border-secondary/30"
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                  }`}>
                    <Shield className="w-4 h-4" />
                    Staff
                  </button>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-600 tracking-wide transition-all duration-200 ${
                      isActive("/admin")
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    }`}>
                      <Shield className="w-4 h-4" />
                      Admin
                    </button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent border border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-sans font-500 text-foreground">{user?.name}</span>
                  {user?.role === "admin" && (
                    <span className="stat-badge bg-secondary/20 text-secondary border border-secondary/30">STAFF</span>
                  )}
                </div>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <button className="px-4 py-2 rounded-lg text-sm font-display font-700 tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground transition-all glow-purple">
                    LOGIN
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-4 py-2 rounded-lg text-sm font-sans font-600 border border-primary/50 text-primary hover:bg-primary/10 transition-all">
                    REGISTER
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-600 tracking-wide transition-all ${
                  isActive(href)
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <Link href="/staff" onClick={() => setMobileOpen(false)}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-600 tracking-wide text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all">
                    <Shield className="w-4 h-4" />
                    Staff Dashboard
                  </button>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-600 tracking-wide text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </button>
                  </Link>
                )}
              </>
            )}
            <div className="pt-3 border-t border-border/50">
              {isAuthenticated ? (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-foreground">{user?.name}</span>
                  <button onClick={() => logoutMutation.mutate()} className="text-sm text-muted-foreground hover:text-foreground">Logout</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login">
                    <button className="w-full px-4 py-3 rounded-lg text-sm font-display font-700 tracking-widest bg-primary text-primary-foreground">
                      LOGIN
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="w-full px-4 py-3 rounded-lg text-sm font-sans font-600 border border-primary/50 text-primary">
                      REGISTER
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
