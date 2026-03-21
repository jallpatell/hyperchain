import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider } from '@/components/SidebarContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
import Workflows from '@/pages/Workflows';
import Editor from '@/pages/Editor';
import Executions from '@/pages/Executions';
import ExecutionDetails from '@/pages/ExecutionDetails';
import Credentials from '@/pages/Credentials';
import Templates from '@/pages/Templates';
import Settings from '@/pages/Settings';
import SignInPage from '@/pages/SignIn';
import SignUpPage from '@/pages/SignUp';

function Router() {
    return (
        <Switch>
            <Route path="/" component={Landing} />
            <Route path="/sign-in" component={SignInPage} />
            <Route path="/sign-up" component={SignUpPage} />
            <Route path="/workflows">
                <ProtectedRoute>
                    <Workflows />
                </ProtectedRoute>
            </Route>
            <Route path="/workflow/:id">
                <ProtectedRoute>
                    <Editor />
                </ProtectedRoute>
            </Route>
            <Route path="/executions">
                <ProtectedRoute>
                    <Executions />
                </ProtectedRoute>
            </Route>
            <Route path="/executions/viewdetails/:id">
                <ProtectedRoute>
                    <ExecutionDetails />
                </ProtectedRoute>
            </Route>
            <Route path="/credentials">
                <ProtectedRoute>
                    <Credentials />
                </ProtectedRoute>
            </Route>
            <Route path="/templates">
                <ProtectedRoute>
                    <Templates />
                </ProtectedRoute>
            </Route>
            <Route path="/settings">
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
        </Switch>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <SidebarProvider>
                    <Toaster />
                    <Router />
                </SidebarProvider>
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;
