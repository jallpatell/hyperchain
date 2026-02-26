import { useCredentials, useCreateCredential, useDeleteCredential } from "@/hooks/use-credentials";
import { useGmailOAuth } from "@/hooks/use-gmail-oauth";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Key, Trash2, ShieldCheck, Database, Lock, Mail, ExternalLink, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Credentials() {
    const { data: credentials, isLoading } = useCredentials();
    const queryClient = useQueryClient();
    const createMutation = useCreateCredential();
    const deleteMutation = useDeleteCredential();
    const gmailOAuthMutation = useGmailOAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showGmailNotice, setShowGmailNotice] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    
    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState("openai");
    const [data, setData] = useState("");
    // fields for Gmail OAuth app configuration
    const [clientIdField, setClientIdField] = useState("");
    const [clientSecretField, setClientSecretField] = useState("");
    const [redirectUriField, setRedirectUriField] = useState("");

    // Check for OAuth callback success
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success");
        const email = params.get("email");
        
        if (success === "true" && email) {
            setSuccessMessage(`✓ Gmail account (${email}) connected successfully!`);

            // invalidate cache so the new credential appears immediately
            queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });

            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            // Show message for 3 seconds
            setTimeout(() => setSuccessMessage(""), 3000);
        }
    }, [queryClient]);

    const handleCreate = async () => {
        try {
            let payload: any = { name, type };
            if (type === "gmail-oauth-config") {
                // stored as plain object then encrypted on server
                payload.data = JSON.stringify({
                    clientId: clientIdField,
                    clientSecret: clientSecretField,
                    redirectUri: redirectUriField || undefined,
                });
            } else if (type === "gmail-oauth") {
                // nothing to send; the oauth flow will create the credential
                payload.data = JSON.stringify({});
            } else {
                payload.data = JSON.stringify({ value: data });
            }

            await createMutation.mutateAsync(payload);
            setIsOpen(false);
            setName("");
            setData("");
            setType("openai");
            setClientIdField("");
            setClientSecretField("");
            setRedirectUriField("");
        } catch (e) {
            console.error(e);
        }
    };

    const handleGmailOAuth = async () => {
        setShowGmailNotice(true);
        try {
            await gmailOAuthMutation.mutateAsync();
        } catch (err) {
            console.error("Gmail OAuth error:", err);
            setShowGmailNotice(false);
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Credentials</h1>
                        <p className="text-muted-foreground mt-1">Securely manage API keys and secrets.</p>
                    </div>
                    
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Key className="w-4 h-4" />
                                New Credential
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Credential</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gmail-oauth">Gmail (OAuth)</SelectItem>
                                            <SelectItem value="gmail-oauth-config">Gmail OAuth App</SelectItem>
                                            <SelectItem value="openai">OpenAI API</SelectItem>
                                            <SelectItem value="postgres">PostgreSQL Database</SelectItem>
                                            <SelectItem value="github">GitHub Token</SelectItem>
                                            <SelectItem value="aws">AWS Credentials</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {type === "gmail-oauth" ? (
                                    <div className="space-y-3">
                                        <Alert>
                                            <Mail className="h-4 w-4" />
                                            <AlertDescription>
                                                Click below to connect your Gmail account. You'll be redirected to Google OAuth.
                                            </AlertDescription>
                                        </Alert>
                                        <Button
                                            onClick={handleGmailOAuth}
                                            disabled={gmailOAuthMutation.isPending}
                                            className="w-full gap-2"
                                        >
                                            {gmailOAuthMutation.isPending ? "Connecting..." : "Connect Gmail"}
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : type === "gmail-oauth-config" ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Name (for reference)</Label>
                                            <Input
                                                placeholder="Gmail OAuth App" 
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Client ID</Label>
                                            <Input
                                                placeholder="google-client-id.apps.googleusercontent.com"
                                                value={clientIdField}
                                                onChange={e => setClientIdField(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Client Secret</Label>
                                            <Input
                                                placeholder="your-client-secret"
                                                value={clientSecretField}
                                                onChange={e => setClientSecretField(e.target.value)}
                                                type="password"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Redirect URI</Label>
                                            <Input
                                                placeholder="http://localhost:5000/api/oauth/gmail/callback"
                                                value={redirectUriField}
                                                onChange={e => setRedirectUriField(e.target.value)}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input 
                                                placeholder="My OpenAI Key" 
                                                value={name} 
                                                onChange={e => setName(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secret Value / JSON</Label>
                                            <Textarea 
                                                className="font-mono text-xs h-24"
                                                placeholder="sk-..." 
                                                value={data}
                                                onChange={e => setData(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                {type !== "gmail-oauth" && (
                                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Saving..." : "Save Credential"}
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {successMessage && (
                    <Alert className="mb-6 bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            {successMessage}
                        </AlertDescription>
                    </Alert>
                )}

                {showGmailNotice && (
                    <Alert className="mb-6 bg-blue-50 border-blue-200">
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            You're being redirected to Google for authentication. Please authorize the app to send emails on your behalf. You'll be returned here once complete.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />)
                    ) : credentials?.map((cred) => (
                        <Card key={cred.id} className="hover:border-primary/50 transition-colors group">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {cred.type === 'gmail-oauth' ? <Mail className="w-5 h-5 text-red-500" /> :
                                         cred.type === 'gmail-oauth-config' ? <ExternalLink className="w-5 h-5 text-blue-500" /> :
                                         cred.type === 'openai' ? <BotIcon className="w-5 h-5 text-purple-500" /> : 
                                         cred.type === 'postgres' ? <Database className="w-5 h-5 text-blue-500" /> :
                                         <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">{cred.name}</CardTitle>
                                        <CardDescription className="capitalize text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                                            {cred.type === 'gmail-oauth' ? 'Gmail OAuth' :
                                             cred.type === 'gmail-oauth-config' ? 'Gmail OAuth App' :
                                             cred.type}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    onClick={() => deleteMutation.mutate(cred.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Lock className="w-3 h-3" />
                                    <span>Encrypted & stored securely</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BotIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
        </svg>
    )
}
