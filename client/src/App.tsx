import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import MatchHistory from "./pages/MatchHistory";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InvitationAccept from "./pages/InvitationAccept";
import WinSubmissionPage from "./pages/WinSubmissionPage";

function Router() {
  return (
    <>
      <NavBar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/teams" component={Teams} />
        <Route path="/team/:id" component={TeamDetail} />
        <Route path="/matches" component={MatchHistory} />
        <Route path="/staff" component={StaffDashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/invite/:token" component={InvitationAccept} />
        <Route path="/submit-win" component={WinSubmissionPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.10 0.015 280)",
                border: "1px solid oklch(0.22 0.04 280)",
                color: "oklch(0.96 0.005 280)",
                fontFamily: "Rajdhani, sans-serif",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
