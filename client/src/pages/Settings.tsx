import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Key,
  Webhook,
  Settings as SettingsIcon,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  LogOut,
  Shield,
  Clock,
  RotateCcw,
  Timer,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch } from '@/lib/auth-fetch';

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UserSettings {
  webhookSecret: string;
  defaultTimeout: number;
  defaultRetryAttempts: number;
  defaultRetryDelay: number;
}

export default function Settings() {
  const { user } = useUser();
  const { signOut, session } = useClerk();
  const { toast } = useToast();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [regeneratingSecret, setRegeneratingSecret] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<number | null>(null);

  const baseWebhookUrl = `${window.location.origin}/api/webhooks`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [keysRes, settingsRes] = await Promise.all([
        authFetch('/api/settings/api-keys', {}, user?.id),
        authFetch('/api/settings', {}, user?.id),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setApiKeys(keysData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a key name',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingKey(true);
      const res = await authFetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      }, user?.id);

      if (res.ok) {
        const data = await res.json();
        setNewKeyValue(data.key);
        setApiKeys([...apiKeys, data.apiKey]);
        setNewKeyName('');
        toast({
          title: 'Success',
          description: 'API key created successfully',
        });
      } else {
        throw new Error('Failed to create API key');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    try {
      setDeletingKeyId(id);
      const res = await authFetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
      }, user?.id);

      if (res.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== id));
        toast({
          title: 'Success',
          description: 'API key deleted successfully',
        });
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive',
      });
    } finally {
      setDeletingKeyId(null);
      setDeleteKeyId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const regenerateWebhookSecret = async () => {
    try {
      setRegeneratingSecret(true);
      const res = await authFetch('/api/settings/webhook-secret', {
        method: 'POST',
      }, user?.id);

      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings!, webhookSecret: data.webhookSecret });
        toast({
          title: 'Success',
          description: 'Webhook secret regenerated',
        });
      } else {
        throw new Error('Failed to regenerate secret');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate webhook secret',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingSecret(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }, user?.id);

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        toast({
          title: 'Success',
          description: 'Settings updated successfully',
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  const signOutAllDevices = async () => {
    try {
      await signOut({ sessionId: session?.id });
      toast({
        title: 'Success',
        description: 'Signed out from all devices',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    const providerLower = provider.toLowerCase();
    
    if (providerLower.includes('google')) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      );
    }
    
    if (providerLower.includes('github')) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      );
    }
    
    if (providerLower.includes('slack')) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#E01E5A" d="M6 15a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-5z"/>
          <path fill="#36C5F0" d="M9 6a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5z"/>
          <path fill="#2EB67D" d="M18 9a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2V9zm-1 0a2 2 0 0 1-2 2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5z"/>
          <path fill="#ECB22E" d="M15 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-5z"/>
        </svg>
      );
    }
    
    return <Check className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account and application preferences</p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user?.fullName || 'Not set'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={user?.primaryEmailAddress?.emailAddress || ''} disabled />
                    <Badge variant="secondary" className="shrink-0">
                      Read-only
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-3 block">Connected Accounts</Label>
                <div className="flex flex-wrap gap-2">
                  {user?.externalAccounts?.map((account) => (
                    <Badge key={account.id} variant="outline" className="gap-2 px-3 py-1.5">
                      {getProviderIcon(account.provider)}
                      <span className="capitalize">{account.provider}</span>
                    </Badge>
                  ))}
                  {(!user?.externalAccounts || user.externalAccounts.length === 0) && (
                    <p className="text-sm text-muted-foreground">No connected accounts</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Manage API keys for external integrations</CardDescription>
                  </div>
                </div>
                <Button onClick={() => {
                  setShowNewKeyDialog(true);
                  setNewKeyValue('');
                  setNewKeyName('');
                }} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No API keys yet</p>
                  <p className="text-sm">Create an API key to trigger workflows programmatically</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`flex items-center justify-between p-4 border-0 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all ${
                        deletingKeyId === key.id ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {key.keyPrefix}...
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(key.createdAt).toLocaleDateString()} •{' '}
                          {key.lastUsedAt
                            ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                            : 'Never used'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteKeyId(key.id)}
                        disabled={deletingKeyId === key.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingKeyId === key.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Webhook Settings</CardTitle>
                  <CardDescription>Configure webhook endpoints and security</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Base Webhook URL</Label>
                <div className="flex gap-2">
                  <Input value={baseWebhookUrl} disabled className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(baseWebhookUrl, 'Webhook URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL as the base for your webhook triggers
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Webhook Secret</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateWebhookSecret}
                    disabled={regeneratingSecret}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingSecret ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={settings?.webhookSecret || ''}
                    disabled
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(settings?.webhookSecret || '', 'Webhook secret')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this secret to verify webhook requests
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Execution Defaults</CardTitle>
                  <CardDescription>Default settings for workflow executions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Default Timeout
                  </Label>
                  <Select
                    value={String(settings?.defaultTimeout || 30)}
                    onValueChange={(value) => updateSettings({ defaultTimeout: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Retry Attempts
                  </Label>
                  <Select
                    value={String(settings?.defaultRetryAttempts || 0)}
                    onValueChange={(value) => updateSettings({ defaultRetryAttempts: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No retries</SelectItem>
                      <SelectItem value="1">1 retry</SelectItem>
                      <SelectItem value="2">2 retries</SelectItem>
                      <SelectItem value="3">3 retries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Retry Delay
                  </Label>
                  <Select
                    value={String(settings?.defaultRetryDelay || 1000)}
                    onValueChange={(value) => updateSettings({ defaultRetryDelay: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">0.5 seconds</SelectItem>
                      <SelectItem value="1000">1 second</SelectItem>
                      <SelectItem value="2000">2 seconds</SelectItem>
                      <SelectItem value="5000">5 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900">
                  These settings apply to new workflow executions. Existing workflows will use their configured
                  values.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border-0 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">You are currently signed in</p>
                </div>
                <Button variant="outline" onClick={signOutAllDevices} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              {newKeyValue
                ? "Save this key securely. You won't be able to see it again."
                : 'Create a new API key for external integrations'}
            </DialogDescription>
          </DialogHeader>
          {newKeyValue ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground mb-2 block">Your API Key</Label>
                <div className="flex gap-2">
                  <Input value={newKeyValue} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newKeyValue, 'API key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-900">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newKeyValue ? (
              <Button
                onClick={() => {
                  setShowNewKeyDialog(false);
                  setNewKeyValue('');
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createApiKey} disabled={creatingKey}>
                  {creatingKey ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Key'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteKeyId !== null} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone and any integrations
              using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && deleteApiKey(deleteKeyId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
