import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Workflows from "@/pages/Workflows";
import Editor from "@/pages/Editor";
import Executions from "@/pages/Executions";
import Credentials from "@/pages/Credentials";
import Templates from "@/pages/Templates";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Workflows} />
      <Route path="/workflow/:id" component={Editor} />
      <Route path="/executions" component={Executions} />
      <Route path="/credentials" component={Credentials} />
      <Route path="/templates" component={Templates} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
