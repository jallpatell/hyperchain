import { useCredentials, useCreateCredential, useDeleteCredential } from '@/hooks/use-credentials';
import { useGmailOAuth } from '@/hooks/use-gmail-oauth';
import { useGoogleOAuth } from '@/hooks/use-google-oauth';
import { useSlackOAuth } from '@/hooks/use-slack-oauth';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/routes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Trash2, ShieldCheck, Database, Lock, Mail, ExternalLink, CheckCircle } from 'lucide-react';
import { SiSlack, SiGoogledrive, SiGooglesheets } from 'react-icons/si';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

const OAUTH_TYPES = ['gmail-oauth', 'google-drive', 'google-sheets', 'slack'];

export default function Credentials() {
    const { data: credentials, isLoading } = useCredentials();
    const queryClient = useQueryClient();
    const createMutation = useCreateCredential();
    const deleteMutation = useDeleteCredential();
    const gmailOAuthMutation = useGmailOAuth();
    const driveOAuthMutation = useGoogleOAuth('drive');
    const sheetsOAuthMutation = useGoogleOAuth('sheets');
    const slackOAuthMutation = useSlackOAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [name, setName] = useState('');
    const [type, setType] = useState('openai');
    const [data, setData] = useState('');
    const [clientIdField, setClientIdField] = useState('');
    const [clientSecretField, setClientSecretField] = useState('');
    const [redirectUriField, setRedirectUriField] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const email = params.get('email');
        const service = params.get('service');
        const error = params.get('error');

        if (success === 'true' && email) {
            const label = service ? `${service} (${email})` : email;
            setSuccessMessage(`✓ ${label} connected successfully!`);
            queryClient.invalidateQueries({ queryKey: [api.credentials.list.path] });
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => setSuccessMessage(''), 4000);
        } else if (error) {
            setSuccessMessage(`✗ Connection failed: ${decodeURIComponent(error)}`);
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    }, [queryClient]);

    const handleCreate = async () => {
        try {
            let payload: any = { name, type };
            if (type === 'gmail-oauth-config') {
                payload.data = JSON.stringify({ clientId: clientIdField, clientSecret: clientSecretField, redirectUri: redirectUriField || undefined });
            } else {
                payload.data = JSON.stringify({ value: data });
            }
            await createMutation.mutateAsync(payload);
            setIsOpen(false);
            setName(''); setData(''); setType('openai');
            setClientIdField(''); setClientSecretField(''); setRedirectUriField('');
        } catch (e) { console.error(e); }
    };

    const credIcon = (credType: string) => {
        if (credType === 'gmail-oauth') return <Mail className="w-5 h-5 text-red-500" />;
        if (credType === 'gmail-oauth-config') return <ExternalLink className="w-5 h-5 text-blue-500" />;
        if (credType === 'google-drive') return <SiGoogledrive className="w-5 h-5 text-blue-500" />;
        if (credType === 'google-sheets') return <SiGooglesheets className="w-5 h-5 text-[#0F9D58]" />;
        if (credType === 'slack') return <SiSlack className="w-5 h-5 text-[#4A154B]" />;
        if (credType === 'openai') return <BotIcon className="w-5 h-5 text-purple-500" />;
        if (credType === 'postgres') return <Database className="w-5 h-5 text-blue-500" />;
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
    };

    const credLabel = (credType: string) => {
        const map: Record<string, string> = {
            'gmail-oauth': 'Gmail OAuth', 'gmail-oauth-config': 'Gmail OAuth App',
            'google-drive': 'Google Drive', 'google-sheets': 'Google Sheets',
            'slack': 'Slack',
        };
        return map[credType] ?? credType;
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
                            <Button className="gap-2"><Key className="w-4 h-4" />New Credential</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New Credential</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gmail-oauth">Gmail (OAuth)</SelectItem>
                                            <SelectItem value="gmail-oauth-config">Gmail OAuth App Config</SelectItem>
                                            <SelectItem value="google-drive">Google Drive (OAuth)</SelectItem>
                                            <SelectItem value="google-sheets">Google Sheets (OAuth)</SelectItem>
                                            <SelectItem value="slack">Slack (OAuth)</SelectItem>
                                            <SelectItem value="openai">OpenAI API Key</SelectItem>
                                            <SelectItem value="postgres">PostgreSQL</SelectItem>
                                            <SelectItem value="github">GitHub Token</SelectItem>
                                            <SelectItem value="aws">AWS Credentials</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {type === 'gmail-oauth' && (
                                    <div className="space-y-3">
                                        <Alert><Mail className="h-4 w-4" /><AlertDescription>You'll be redirected to Google OAuth to connect your Gmail account.</AlertDescription></Alert>
                                        <Button onClick={() => gmailOAuthMutation.mutate()} disabled={gmailOAuthMutation.isPending} className="w-full gap-2">
                                            {gmailOAuthMutation.isPending ? 'Connecting...' : 'Connect Gmail'}<ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {type === 'google-drive' && (
                                    <div className="space-y-3">
                                        <Alert><SiGoogledrive className="h-4 w-4 text-blue-500" /><AlertDescription>Connect Google Drive to list, read, and upload files.</AlertDescription></Alert>
                                        <Button onClick={() => driveOAuthMutation.mutate()} disabled={driveOAuthMutation.isPending} className="w-full gap-2">
                                            {driveOAuthMutation.isPending ? 'Connecting...' : 'Connect Google Drive'}<ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {type === 'google-sheets' && (
                                    <div className="space-y-3">
                                        <Alert><SiGooglesheets className="h-4 w-4 text-[#0F9D58]" /><AlertDescription>Connect Google Sheets to read, append, and update spreadsheets.</AlertDescription></Alert>
                                        <Button onClick={() => sheetsOAuthMutation.mutate()} disabled={sheetsOAuthMutation.isPending} className="w-full gap-2">
                                            {sheetsOAuthMutation.isPending ? 'Connecting...' : 'Connect Google Sheets'}<ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {type === 'slack' && (
                                    <div className="space-y-3">
                                        <Alert><SiSlack className="h-4 w-4 text-[#4A154B]" /><AlertDescription>Connect your Slack workspace to send messages to channels.</AlertDescription></Alert>
                                        <Button onClick={() => slackOAuthMutation.mutate()} disabled={slackOAuthMutation.isPending} className="w-full gap-2">
                                            {slackOAuthMutation.isPending ? 'Connecting...' : 'Connect Slack'}<ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {type === 'gmail-oauth-config' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input placeholder="Gmail OAuth App" value={name} onChange={(e) => setName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Client ID</Label>
                                            <Input placeholder="*.apps.googleusercontent.com" value={clientIdField} onChange={(e) => setClientIdField(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Client Secret</Label>
                                            <Input type="password" placeholder="your-client-secret" value={clientSecretField} onChange={(e) => setClientSecretField(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Redirect URI</Label>
                                            <Input placeholder="http://localhost:5000/api/oauth/gmail/callback" value={redirectUriField} onChange={(e) => setRedirectUriField(e.target.value)} />
                                        </div>
                                    </>
                                )}

                                {!OAUTH_TYPES.includes(type) && type !== 'gmail-oauth-config' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input placeholder="My API Key" value={name} onChange={(e) => setName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Secret Value / JSON</Label>
                                            <Textarea className="font-mono text-xs h-24" placeholder="sk-..." value={data} onChange={(e) => setData(e.target.value)} />
                                        </div>
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                {!OAUTH_TYPES.includes(type) && (
                                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                        {createMutation.isPending ? 'Saving...' : 'Save Credential'}
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                
                {successMessage && (
                    <Alert className={`mb-6 ${successMessage.startsWith('✗') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <CheckCircle className={`h-4 w-4 ${successMessage.startsWith('✗') ? 'text-red-600' : 'text-green-600'}`} />
                        <AlertDescription className={successMessage.startsWith('✗') ? 'text-red-800' : 'text-green-800'}>{successMessage}</AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading
                        ? [1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />)
                        : credentials?.map((cred) => (
                            <Card key={cred.id} className="hover:border-primary/50 transition-colors group">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">{credIcon(cred.type)}</div>
                                        <div className="space-y-1">
                                            <CardTitle className="text-base">{cred.name}</CardTitle>
                                            <CardDescription className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                                                {credLabel(cred.type)}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={() => deleteMutation.mutate(cred.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Lock className="w-3 h-3" /><span>Encrypted & stored securely</span>
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
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
        </svg>
    );
}
