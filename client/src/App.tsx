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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Workflows} />
      <Route path="/workflow/:id" component={Editor} />
      <Route path="/executions" component={Executions} />
      <Route path="/credentials" component={Credentials} />
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
