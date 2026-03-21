import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { useCreateWorkflow } from '@/hooks/use-workflows';
import { useLocation } from 'wouter';
import { Sparkles, TrendingUp, Headphones, BarChart3, ArrowRight, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
    id: string;
    name: string;
    description: string;
    icon: any;
    iconColor: string;
    bgGradient: string;
    value: string;
    tags: string[];
    nodes: any[];
    edges: any[];
}

const TEMPLATES: Template[] = [
    {
        id: 'ai-sdr',
        name: 'AI SDR - Cold Outreach Machine',
        description: 'AI that researches your leads and sends hyper-personalized emails at scale. Replaces a junior SDR with dynamic follow-ups based on replies.',
        icon: Sparkles,
        iconColor: 'text-[#EF486F]',
        bgGradient: 'from-[#EF486F]/10 to-[#EF486F]/5',
        value: 'Replaces junior SDR → $50-500/mo value',
        tags: ['Sales', 'AI', 'Email', 'CRM'],
        nodes: [
            { id: 'trigger', type: 'webhook', position: { x: 50, y: 100 }, data: { label: 'Webhook' } },
            { id: 'enrich', type: 'http-request', position: { x: 300, y: 100 }, data: { url: 'https://api.clearbit.com/v2/companies/find?domain={{trigger.body.domain}}', method: 'GET', label: 'HTTP Request' } },
            { id: 'research', type: 'ai-chat', position: { x: 550, y: 100 }, data: { prompt: 'Research this company and identify 3 key pain points based on their industry and size: {{enrich.body}}', label: 'AI Chat' } },
            { id: 'personalize', type: 'ai-chat', position: { x: 800, y: 100 }, data: { prompt: 'Generate a personalized cold email for {{enrich.body.name}} addressing these pain points: {{research.text}}. Keep it under 100 words.', label: 'AI Chat' } },
            { id: 'send', type: 'email', position: { x: 1050, y: 100 }, data: { to: 'lead@example.com', subject: 'Quick question about your workflow', body: '{{personalize.text}}', label: 'Email' } },
            { id: 'crm', type: 'http-request', position: { x: 1300, y: 100 }, data: { url: 'https://api.salesforce.com/services/data/v52.0/sobjects/Lead', method: 'POST', body: { email: '{{trigger.body.email}}', status: 'Contacted' }, label: 'HTTP Request' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'enrich' },
            { id: 'e2', source: 'enrich', target: 'research' },
            { id: 'e3', source: 'research', target: 'personalize' },
            { id: 'e4', source: 'personalize', target: 'send' },
            { id: 'e5', source: 'send', target: 'crm' },
        ],
    },
    {
        id: 'marketing-optimizer',
        name: 'Marketing Campaign Optimizer',
        description: 'AI that manages and optimizes your ad campaigns daily. Analyzes performance, detects underperforming ads, and suggests budget reallocation.',
        icon: TrendingUp,
        iconColor: 'text-blue-600',
        bgGradient: 'from-blue-500/10 to-blue-500/5',
        value: 'Reduces CAC, increases conversions',
        tags: ['Marketing', 'AI', 'Analytics', 'Ads'],
        nodes: [
            { id: 'trigger', type: 'webhook', position: { x: 50, y: 150 }, data: { label: 'Webhook' } },
            { id: 'fetch-google', type: 'http-request', position: { x: 300, y: 100 }, data: { url: 'https://googleads.googleapis.com/v14/customers/YOUR_CUSTOMER_ID/googleAds:searchStream', method: 'POST', body: { query: 'SELECT campaign.id, campaign.name, metrics.cost_micros FROM campaign' }, label: 'HTTP Request' } },
            { id: 'fetch-fb', type: 'http-request', position: { x: 300, y: 200 }, data: { url: 'https://graph.facebook.com/v18.0/act_YOUR_AD_ACCOUNT/insights', method: 'GET', label: 'HTTP Request' } },
            { id: 'aggregate', type: 'code', position: { x: 550, y: 150 }, data: { code: 'const google = $inputs["fetch-google"]?.body?.results || [];\nconst fb = $inputs["fetch-fb"]?.body?.data || [];\nreturn { campaigns: [...google, ...fb], totalCampaigns: google.length + fb.length };', label: 'Code' } },
            { id: 'analyze', type: 'ai-chat', position: { x: 800, y: 150 }, data: { prompt: 'Analyze these ad campaigns and identify: 1) Underperforming ads 2) High CPC keywords 3) Winning creatives. Campaign data: {{aggregate.campaigns}}', label: 'AI Chat' } },
            { id: 'actions', type: 'ai-chat', position: { x: 1050, y: 150 }, data: { prompt: 'Based on this analysis: {{analyze.text}}, suggest 3 specific actions: new ad copy ideas, budget reallocation recommendations, and targeting adjustments.', label: 'AI Chat' } },
            { id: 'report', type: 'http-request', position: { x: 1300, y: 150 }, data: { url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { channel: 'marketing', text: 'Daily Campaign Report: {{actions.text}}' }, label: 'HTTP Request' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'fetch-google' },
            { id: 'e2', source: 'trigger', target: 'fetch-fb' },
            { id: 'e3', source: 'fetch-google', target: 'aggregate' },
            { id: 'e4', source: 'fetch-fb', target: 'aggregate' },
            { id: 'e5', source: 'aggregate', target: 'analyze' },
            { id: 'e6', source: 'analyze', target: 'actions' },
            { id: 'e7', source: 'actions', target: 'report' },
        ],
    },
    {
        id: 'support-ai',
        name: 'Customer Support AI + Ticket Automation',
        description: 'AI that resolves support tickets instantly and escalates only when needed. Reduces support cost by 50-80% with smart classification and context-aware replies.',
        icon: Headphones,
        iconColor: 'text-green-600',
        bgGradient: 'from-green-500/10 to-green-500/5',
        value: 'Reduces support cost by 50-80%',
        tags: ['Support', 'AI', 'Automation', 'CX'],
        nodes: [
            { id: 'trigger', type: 'webhook', position: { x: 50, y: 150 }, data: { label: 'Webhook' } },
            { id: 'classify', type: 'ai-chat', position: { x: 300, y: 150 }, data: { prompt: 'Classify this support ticket into one category: Billing, Technical, Refund, or Spam. Return only the category name. Ticket: {{trigger.body.message}}', label: 'AI Chat' } },
            { id: 'kb-search', type: 'http-request', position: { x: 550, y: 150 }, data: { url: 'https://api.notion.com/v1/search', method: 'POST', body: { query: '{{classify.text}}', filter: { property: 'object', value: 'page' } }, label: 'HTTP Request' } },
            { id: 'generate-reply', type: 'ai-chat', position: { x: 800, y: 150 }, data: { prompt: 'Generate a helpful support reply for this ticket: {{trigger.body.message}}. Use this knowledge base context: {{kb-search.body}}. Be empathetic and provide clear steps.', label: 'AI Chat' } },
            { id: 'confidence', type: 'code', position: { x: 1050, y: 150 }, data: { code: 'const reply = $inputs["generate-reply"]?.text || "";\nconst confidence = reply.length > 50 ? "high" : "low";\nreturn { confidence, reply };', label: 'Code' } },
            { id: 'auto-send', type: 'email', position: { x: 1300, y: 100 }, data: { to: 'customer@example.com', subject: 'Re: Your Support Request', body: '{{confidence.reply}}', label: 'Email' } },
            { id: 'escalate', type: 'http-request', position: { x: 1300, y: 200 }, data: { url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { channel: 'support', text: 'Ticket needs review: {{trigger.body.message}}' }, label: 'HTTP Request' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'classify' },
            { id: 'e2', source: 'classify', target: 'kb-search' },
            { id: 'e3', source: 'kb-search', target: 'generate-reply' },
            { id: 'e4', source: 'generate-reply', target: 'confidence' },
            { id: 'e5', source: 'confidence', target: 'auto-send' },
            { id: 'e6', source: 'confidence', target: 'escalate' },
        ],
    },
    {
        id: 'revenue-ops',
        name: 'Revenue Ops Dashboard + Auto-Reporting',
        description: 'AI-powered revenue insights dashboard. Combines CRM, ads, and payment data to generate actionable insights with anomaly detection.',
        icon: BarChart3,
        iconColor: 'text-purple-600',
        bgGradient: 'from-purple-500/10 to-purple-500/5',
        value: 'Executive time-saver + insights',
        tags: ['Analytics', 'AI', 'Revenue', 'Reporting'],
        nodes: [
            { id: 'trigger', type: 'webhook', position: { x: 50, y: 200 }, data: { label: 'Webhook' } },
            { id: 'crm', type: 'http-request', position: { x: 300, y: 150 }, data: { url: 'https://api.hubspot.com/crm/v3/objects/deals?limit=100', method: 'GET', label: 'HTTP Request' } },
            { id: 'ads', type: 'http-request', position: { x: 300, y: 250 }, data: { url: 'https://googleads.googleapis.com/v14/customers/YOUR_CUSTOMER_ID/googleAds:searchStream', method: 'POST', body: { query: 'SELECT metrics.conversions, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_7_DAYS' }, label: 'HTTP Request' } },
            { id: 'payments', type: 'http-request', position: { x: 300, y: 350 }, data: { url: 'https://api.stripe.com/v1/charges?limit=100', method: 'GET', label: 'HTTP Request' } },
            { id: 'merge', type: 'code', position: { x: 550, y: 250 }, data: { code: 'const crm = $inputs.crm?.body || {};\nconst ads = $inputs.ads?.body || {};\nconst payments = $inputs.payments?.body || {};\nreturn { crm, ads, payments, timestamp: new Date().toISOString() };', label: 'Code' } },
            { id: 'insights', type: 'ai-chat', position: { x: 800, y: 250 }, data: { prompt: 'Analyze this revenue data and provide 3 key insights: 1) Revenue trends 2) Funnel drop-offs 3) Growth opportunities. Keep it concise and actionable. Data: {{merge}}', label: 'AI Chat' } },
            { id: 'anomaly', type: 'ai-chat', position: { x: 1050, y: 250 }, data: { prompt: 'Detect any anomalies in this revenue data: sudden drops in conversions, spikes in churn, unusual patterns. Data: {{merge}}. List only critical issues.', label: 'AI Chat' } },
            { id: 'report', type: 'code', position: { x: 1300, y: 250 }, data: { code: 'const summary = $inputs.insights?.text || "No insights available";\nconst anomalies = $inputs.anomaly?.text || "No anomalies detected";\nreturn { summary, anomalies, timestamp: new Date().toISOString() };', label: 'Code' } },
            { id: 'deliver', type: 'http-request', position: { x: 1550, y: 250 }, data: { url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { channel: 'executives', text: 'Weekly Revenue Report:\n\n{{report.summary}}\n\nAnomalies:\n{{report.anomalies}}' }, label: 'HTTP Request' } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'crm' },
            { id: 'e2', source: 'trigger', target: 'ads' },
            { id: 'e3', source: 'trigger', target: 'payments' },
            { id: 'e4', source: 'crm', target: 'merge' },
            { id: 'e5', source: 'ads', target: 'merge' },
            { id: 'e6', source: 'payments', target: 'merge' },
            { id: 'e7', source: 'merge', target: 'insights' },
            { id: 'e8', source: 'merge', target: 'anomaly' },
            { id: 'e9', source: 'insights', target: 'report' },
            { id: 'e10', source: 'anomaly', target: 'report' },
            { id: 'e11', source: 'report', target: 'deliver' },
        ],
    },
];

const Templates = () => {
    const createMutation = useCreateWorkflow();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [creatingId, setCreatingId] = useState<string | null>(null);

    const handleUseTemplate = async (template: Template) => {
        setCreatingId(template.id);
        try {
            const workflow = await createMutation.mutateAsync({
                name: template.name,
                description: template.description,
                nodes: template.nodes,
                edges: template.edges,
            });
            toast({
                title: 'Template created!',
                description: `${template.name} has been added to your workflows.`,
            });
            setLocation(`/workflow/${workflow.id}`);
        } catch (error) {
            toast({
                title: 'Failed to create workflow',
                description: 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setCreatingId(null);
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                <Zap className="w-8 h-8 text-[#EF486F]" />
                                Workflow Templates
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Pre-built AI workflows ready to deploy. Create an instance and customize to your needs.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {TEMPLATES.map((template) => {
                            const Icon = template.icon;
                            const isCreating = creatingId === template.id;
                            return (
                                <div
                                    key={template.id}
                                    className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-200 overflow-hidden"
                                >
                                    <div className={`h-2 bg-gradient-to-r ${template.bgGradient}`} />
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.bgGradient} flex items-center justify-center`}>
                                                <Icon className={`w-6 h-6 ${template.iconColor}`} />
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                                <Sparkles className="w-3 h-3" />
                                                AI-Powered
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                                            {template.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                            {template.description}
                                        </p>

                                        <div className="flex items-center gap-2 mb-4 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            {template.value}
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {template.tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        <Button
                                            onClick={() => handleUseTemplate(template)}
                                            disabled={isCreating}
                                            className="w-full gap-2 shadow-primary/20"
                                        >
                                            {isCreating ? (
                                                'Creating...'
                                            ) : (
                                                <>
                                                    Use Template
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-border">
                        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#EF486F]" />
                            How Templates Work
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            These templates are pre-configured workflows visible to all users. Click "Use Template" to create your own instance in the Workflows page, where you can customize nodes, add credentials, and activate the workflow. Templates cannot be edited directly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Templates;
