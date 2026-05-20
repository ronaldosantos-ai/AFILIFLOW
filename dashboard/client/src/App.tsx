import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminUsers from "./pages/AdminUsers";
import Approvals from "./pages/Approvals";
import Metrics from "./pages/Metrics";
import Posts from "./pages/Posts";
import Config from "./pages/Config";
import Logs from "./pages/Logs";
import Cache from "./pages/Cache";
import Integrations from "./pages/Integrations";
import PublishManual from "./pages/PublishManual";
import Scheduler from "./pages/Scheduler";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Metrics} />
      <Route path="/posts" component={Posts} />
      <Route path="/config" component={Config} />
      <Route path="/logs" component={Logs} />
      <Route path="/cache" component={Cache} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/publish-manual" component={PublishManual} />
      <Route path="/scheduler" component={Scheduler} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
