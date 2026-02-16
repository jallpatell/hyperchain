import { useCredentials, useCreateCredential, useDeleteCredential } from "@/hooks/use-credentials";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Key, Trash2, ShieldCheck, Database, Lock } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function Credentials() {
    const { data: credentials, isLoading } = useCredentials();
    const createMutation = useCreateCredential();
    const deleteMutation = useDeleteCredential();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState("openai");
    const [data, setData] = useState("");

    const handleCreate = async () => {
        try {
            // In a real app, 'data' would be structured object based on type
            // Here we just store the raw string/json for simplicity
            await createMutation.mutateAsync({
                name,
                type,
                data: { value: data } 
            });
            setIsOpen(false);
            setName("");
            setData("");
        } catch (e) {
            console.error(e);
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
                            <Button className="gap-2 shadow-lg shadow-primary/20">
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
                                    <Label>Name</Label>
                                    <Input 
                                        placeholder="My OpenAI Key" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="openai">OpenAI API</SelectItem>
                                            <SelectItem value="postgres">PostgreSQL Database</SelectItem>
                                            <SelectItem value="github">GitHub Token</SelectItem>
                                            <SelectItem value="aws">AWS Credentials</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Saving..." : "Save Credential"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />)
                    ) : credentials?.map((cred) => (
                        <Card key={cred.id} className="hover:border-primary/50 transition-colors group">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        {cred.type === 'openai' ? <BotIcon className="w-5 h-5 text-purple-500" /> : 
                                         cred.type === 'postgres' ? <Database className="w-5 h-5 text-blue-500" /> :
                                         <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">{cred.name}</CardTitle>
                                        <CardDescription className="capitalize text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                                            {cred.type}
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
