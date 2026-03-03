import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DomainPortGenerator from "./pages/DomainPortGenerator";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import AppAuthGuard from "./components/AppAuthGuard";
import AdminFirstSetup from "./pages/AdminFirstSetup";
import ScheduledTasks from "./pages/ScheduledTasks";
import Scheduler from './pages/Scheduler';
import DomainLibrary from './pages/DomainLibrary';
import SeoNav from './pages/SeoNav';
import { useGlobalCopyBlock } from "./hooks/useGlobalCopyBlock";
import { useIdleLogout } from "./hooks/useIdleLogout";
import { useAppAuth } from "./hooks/useAppAuth";
import { toast } from "sonner";
import { useCallback } from "react";
import QualityAlertDialog from "./components/QualityAlertDialog";

function IdleLogoutWrapper({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, logout } = useAppAuth();
  const [, navigate] = useLocation();

  const handleLogout = useCallback(() => {
    logout();
    toast.warning("您已因长时间无操作自动登出，请重新登录", { duration: 5000 });
    navigate("/login");
  }, [logout, navigate]);

  const handleWarn = useCallback((remainingMs: number) => {
    const minutes = Math.round(remainingMs / 60000);
    toast.info(`您将在 ${minutes} 分钟后因无操作自动登出`, { duration: 10000, id: "idle-warn" });
  }, []);

  useIdleLogout({ isLoggedIn, onLogout: handleLogout, onWarn: handleWarn });

  return <>{children}</>;
}

function Router() {
  return (
    <AppAuthGuard>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/admin-first-setup" component={AdminFirstSetup} />
        <Route path={"/"} component={DomainPortGenerator} />
        <Route path={"/checker"}>{() => <Home />}</Route>
        <Route path={"/scheduled"} component={ScheduledTasks} />
        <Route path={"/scheduler"} component={Scheduler} />
        <Route path={"/library"} component={DomainLibrary} />
        <Route path={"/seo-nav"} component={SeoNav} />
        <Route path={"/admin"} component={AdminPanel} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppAuthGuard>
  );
}

function App() {
  useGlobalCopyBlock();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <IdleLogoutWrapper>
            <Router />
            <QualityAlertDialog />
          </IdleLogoutWrapper>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
