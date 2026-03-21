import { useState, useEffect } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import { CircuitBackground } from "@/components/CircuitBackground";
import { FaRegCaretSquareRight } from "react-icons/fa";
import workflowCard from "/workflow-card.png";
import workflowDiagram from "/workflow-diagram.png";

/* ─── useScrollReveal ─── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && e.target.classList.add("visible"),
        ),
      { threshold: 0.12 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─── useScrollProgress ─── */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return progress;
}

/* ─── Nav ─── */
const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
  { label: "Blog", href: "#blog" },
];

/* ─── Data ─── */
const LOGOS = [
  "Stripe",
  "Salesforce",
  "HubSpot",
  "Slack",
  "Notion",
  "Linear",
  "Airtable",
  "GitHub",
];

const BENTO_FEATURES = [
  {
    size: "col-span-2 row-span-2",
    label: "WORKFLOW ENGINE",
    title: "Build automations in minutes",
    desc: "Drag-and-drop your way to powerful multi-step workflows. Connect 400+ integrations with no code.",
    accent: "#EF486F",
    image: workflowDiagram,
    imageAlt: "Hyperchain workflow diagram",
    dark: false,
  },
  {
    size: "col-span-1 row-span-1",
    label: "AGENT RUNTIME",
    title: "AI Agents that act",
    desc: "Deploy autonomous agents that reason, decide, and execute across your stack.",
    accent: "#7c3aed",
    dark: false,
    code: `agent.run({
  trigger: "new_lead",
  model: "gpt-4o",
  tools: ["crm", "email"]
})`,
  },
  {
    size: "col-span-1 row-span-1",
    label: "SELF-HEALING",
    title: "Zero downtime",
    desc: "Workflows auto-recover from failures. AI diagnoses root causes and patches in real-time.",
    accent: "#16a34a",
    dark: false,
    stat: { value: "99.98%", label: "Uptime SLA" },
  },
  {
    size: "col-span-1 row-span-2",
    label: "LIVE AGENTS",
    title: "Monitor every node",
    desc: "Real-time execution logs, performance metrics, and anomaly alerts across all your workflows.",
    accent: "#EF486F",
    dark: false,
    image: workflowCard,
    imageAlt: "Hyperchain agent card",
  },
  {
    size: "col-span-1 row-span-1",
    label: "DATA TRANSFORM",
    title: "LLM-powered mapping",
    desc: "Transform, enrich, and normalize data as it flows — powered by large language models.",
    accent: "#f59e0b",
    dark: false,
    code: `transform({
  input: rawLead,
  prompt: "normalize & enrich",
  output: CRMSchema
})`,
  },
  {
    size: "col-span-1 row-span-1",
    label: "ENTERPRISE",
    title: "SOC 2 certified",
    desc: "End-to-end encryption, RBAC, audit logs, SSO/SAML. Built for compliance from day one.",
    accent: "#0ea5e9",
    dark: false,
    stat: { value: "SOC 2", label: "Type II Certified" },
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect your tools",
    desc: "Link apps in seconds with OAuth. 400+ integrations available out of the box.",
  },
  {
    num: "02",
    title: "Design your workflow",
    desc: "Use the visual builder or describe in plain English — AI generates the whole flow for you.",
  },
  {
    num: "03",
    title: "AI runs it 24/7",
    desc: "Your automations execute continuously. Monitor, alert, and auto-heal without lifting a finger.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Hyperchain replaced 3 different automation tools we were using. It's the only platform that actually understands what we're trying to do.",
    name: "Sarah Chen",
    role: "Head of Operations, Foundry",
    avatar: "SC",
  },
  {
    quote:
      "We automated our entire lead-to-close pipeline in 2 days. What used to take a week now happens instantly.",
    name: "Marcus Rivera",
    role: "VP Revenue, Polaris AI",
    avatar: "MR",
  },
  {
    quote:
      "The self-healing workflows are incredible. Zero downtime in 6 months. Our team doesn't even think about automation anymore.",
    name: "Aisha Patel",
    role: "CTO, Crestline Labs",
    avatar: "AP",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    desc: "For small teams getting started.",
    features: [
      "5,000 tasks/month",
      "50 active workflows",
      "50+ integrations",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$149",
    desc: "For scaling teams needing power.",
    features: [
      "50,000 tasks/month",
      "Unlimited workflows",
      "400+ integrations",
      "AI suggestions",
      "Priority support",
      "Custom logic",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Advanced security & compliance.",
    features: [
      "Unlimited tasks",
      "Dedicated infra",
      "SSO + SAML",
      "SOC 2 Type II",
      "SLA guarantee",
      "Dedicated CSM",
    ],
    cta: "Talk to sales",
    highlight: false,
  },
];

const FAQS = [
  {
    q: "How is Hyperchain different from Zapier or n8n?",
    a: "Hyperchain combines Zapier's simplicity with n8n's power, then adds AI that makes your workflows smarter over time. Self-healing and AI-generated suggestions are unique to Hyperchain.",
  },
  {
    q: "Do I need coding skills?",
    a: "Not at all. Our visual builder lets anyone automate. But power users get full JavaScript/Python access in code nodes.",
  },
  {
    q: "How does the AI workflow builder work?",
    a: 'Describe what you want in plain English — "When a lead submits the form, add to HubSpot, notify Slack, create a Linear task." Hyperchain builds it.',
  },
  {
    q: "Can I migrate from n8n or Zapier?",
    a: "Yes! Our migration tool imports existing workflows. Most migrations complete in under an hour.",
  },
];

/* ─── Sub-components ─── */
function BentoCard({ item }: { item: (typeof BENTO_FEATURES)[number] }) {
  return (
    <div
      className={`bento-card relative overflow-hidden ${item.size} flex flex-col`}
    >
      <div className="absolute inset-0 dotted-grid-light opacity-60 pointer-events-none" />
      <div className="relative z-10 p-5 pb-0">
        <span
          className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{ color: item.accent, background: item.accent + "14" }}
        >
          {item.label}
        </span>
      </div>
      <div className="relative z-10 p-5 pt-3 flex flex-col flex-1">
        <h3 className="font-bold text-[#1a1d23] text-lg leading-snug mb-1.5">
          {item.title}
        </h3>
        <p className="text-[#6b7280] text-sm leading-relaxed mb-4">
          {item.desc}
        </p>
        {item.code && (
          <div className="mt-auto rounded-xl bg-[#F1F2F4] border border-[#e5e7eb] p-3.5 overflow-hidden">
            <pre className="font-mono-tech text-[11px] text-[#374151] leading-relaxed whitespace-pre">
              {item.code}
            </pre>
          </div>
        )}
        {item.stat && (
          <div className="mt-auto pt-3 border-t border-[#F1F2F4]">
            <div
              className="font-bold text-3xl tracking-tight"
              style={{ color: item.accent }}
            >
              {item.stat.value}
            </div>
            <div className="font-mono-tech text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">
              {item.stat.label}
            </div>
          </div>
        )}
        {item.image && (
          <div className="mt-3 rounded-xl overflow-hidden border border-[#e5e7eb] flex-1 min-h-[140px] relative">
            <img
              src={item.image}
              alt={item.imageAlt}
              className="w-full h-full object-cover object-top"
            />
          </div>
        )}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${item.accent}60, transparent)`,
        }}
      />
    </div>
  );
}

function WorkflowNode({
  icon,
  label,
  sublabel,
  color,
}: {
  icon: string;
  label: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 bg-white rounded-xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow cursor-default min-w-[100px]">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
        style={{ background: color + "18" }}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-[#1a1d23]">{label}</div>
        <div className="font-mono-tech text-[10px] text-[#9ca3af] uppercase tracking-wide">
          {sublabel}
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="shrink-0 text-[#EF486F]/40">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M6 14h16M17 9l5 5-5 5"
          stroke="#EF486F"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollProgress = useScrollProgress();
  const { isSignedIn } = useAuth();
  useScrollReveal();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1d23] font-sans overflow-x-hidden">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl">
        <nav
          className={`nav-glass rounded-2xl px-6 py-3 flex items-center justify-between transition-shadow duration-300 ${
            scrolled ? "shadow-xl" : "shadow-sm"
          }`}
        >
          <a href="#" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <img src="favicon.png" alt="logo" className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#1a1d23]">
              HyperChain
            </span>
          </a>
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-3 py-1.5 text-sm font-medium text-[#555] hover:text-[#1a1d23] rounded-lg hover:bg-[#F1F2F4] transition-colors no-underline"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            {isSignedIn ? (
              <>
                <a
                  href="/workflows"
                  className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 no-underline flex items-center gap-2"
                  style={{ background: "#EF486F" }}
                >
                  Go to Dashboard <FaRegCaretSquareRight />
                </a>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-4 py-1.5 text-sm font-medium text-[#555] hover:text-[#1a1d23] rounded-lg hover:bg-[#F1F2F4] transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 flex items-center gap-2"
                    style={{ background: "#EF486F" }}
                  >
                    Get Started <FaRegCaretSquareRight />
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-[#F1F2F4] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              {mobileOpen ? (
                <path
                  d="M5 5l12 12M17 5l-12 12"
                  stroke="#1a1d23"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h16M3 11h16M3 16h16"
                  stroke="#1a1d23"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </nav>
        {mobileOpen && (
          <div className="mt-2 nav-glass rounded-2xl p-4 flex flex-col gap-2 shadow-lg md:hidden">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#555] hover:text-[#1a1d23] rounded-lg hover:bg-[#F1F2F4] transition-colors no-underline"
              >
                {l.label}
              </a>
            ))}
            <hr className="my-1 border-[#e5e7eb]" />
            <a
              href="/workflows"
              className="px-4 py-2 text-sm font-semibold text-white text-center rounded-xl no-underline flex items-center justify-center gap-2"
              style={{ background: "#EF486F" }}
            >
              Go to Dashboard <FaRegCaretSquareRight />
            </a>
          </div>
        )}
      </div>
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 overflow-hidden bg-white">
        <div className="absolute inset-0 dotted-grid opacity-70 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <CircuitBackground variant="light" scrollProgress={scrollProgress} />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(239,72,111,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">

          <h1 className="delay-1 text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 text-[#1a1d23]">
            Automate anything at <br></br>{" "}
            <span className="gradient-text">Speed of Thought</span>

          </h1>
          <p className="delay-2 text-xl md:text-2xl text-[#6b7280] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Hyperchain connects your apps, automates your processes, and uses AI
            to keep everything running — so your team can{" "}

            <span className="inline-block border-2 border-dotted border-[#d1d5db] px-2 py-[2px] -rotate-2 rounded-sm">
              <span className="inline-block rotate-2 font-semibold">
                focus
              </span>
            </span>{" "}

            on what{" "}

            <span className="inline-block border-2 border-dotted border-[#d1d5db] px-2 py-[2px] rotate-2 rounded-sm">
              <span className="inline-block -rotate-2 font-semibold">
                matters
              </span>
            </span>.
          </p>

          <div className="delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-14">
            {isSignedIn ? (
              <a
                href="/workflows"
                className="px-8 py-4 text-base font-semibold text-white rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all no-underline inline-block shadow-lg"
                style={{
                  background: "#EF486F",
                  boxShadow: "0 8px 40px rgba(239,72,111,0.3)",
                }}
              >
                Go to Dashboard
              </a>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button
                    className="px-8 py-4 text-base font-semibold text-white rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all inline-block shadow-lg"
                    style={{
                      background: "#EF486F",
                      boxShadow: "0 8px 40px rgba(239,72,111,0.3)",
                    }}
                  >
                    Start building for free
                  </button>
                </SignUpButton>
                <a
                  href="#"
                  className="px-8 py-4 text-base font-semibold text-[#1a1d23] rounded-xl border border-[#e5e7eb] hover:bg-[#F1F2F4] transition-all no-underline inline-flex items-center gap-2 bg-white"
                >
                  Watch demo <FaRegCaretSquareRight />
                </a>
              </>
            )}
          </div>
          {/* <p className="delay-4 font-mono-tech text-xs text-[#9ca3af] tracking-wide">
            NO CREDIT CARD · FREE UP TO 1,000 TASKS/MONTH · SETUP IN 2 MIN
          </p> */}
        </div>
        <div className="relative z-10 mt-16 w-full max-w-4xl mx-auto px-6 animate-float">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F2F4] bg-[#F1F2F4]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 font-mono-tech text-xs text-[#9ca3af]">
                app.hyperchain.ai/workflows/rag-agent
              </div>
              <span className="status-active">
                <span className="status-dot" />
                Running
              </span>
            </div>
            <div className="relative bg-[#fafafa]" style={{ minHeight: 200 }}>
              <div className="absolute inset-0 dotted-grid-light opacity-80" />
              <img
                src={workflowDiagram}
                alt="Workflow diagram"
                className="relative z-10 w-full object-contain max-h-60 p-4"
              />
            </div>
            <div className="px-5 py-3 border-t border-[#F1F2F4] flex items-center gap-4 bg-white">
              <span className="font-mono-tech text-[11px] text-[#9ca3af] uppercase tracking-wide">
                Last run: 2s ago
              </span>
              <span className="font-mono-tech text-[11px] text-[#9ca3af]">
                847 tasks this week
              </span>
              <span className="ml-auto font-mono-tech text-[11px] text-[#EF486F]">
                ↑ 12% vs last week
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* <section className="py-14 border-y border-[#F1F2F4] bg-[#fafafa] relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <p className="text-center font-mono-tech text-[11px] font-medium text-[#b0b8c8] mb-8 uppercase tracking-widest">
            Trusted by teams at the world's fastest-growing companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="text-[#c4c9d4] font-semibold text-base hover:text-[#9ca3af] transition-colors cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section> */}

      <section
        id="product"
        className="py-24 bg-white relative overflow-hidden"
      >
        <div className="absolute inset-0 dotted-grid-light opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <CircuitBackground
            variant="light"
            scrollProgress={Math.min(scrollProgress * 2, 1)}
          />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              Features
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-[#1a1d23] tracking-tight">
              Everything automation
              <br />
              needs to{" "}
              <span className="gradient-text">work like magic</span>
            </h2>
            <p className="mt-4 text-lg text-[#6b7280] max-w-xl mx-auto">
              From simple task automation to complex multi-step AI pipelines.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
            <div className="bento-card md:col-span-2 md:row-span-2 relative flex flex-col reveal">
              <div className="absolute inset-0 dotted-grid-light opacity-60 pointer-events-none" />
              <div className="relative z-10 p-5">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                  style={{ color: "#EF486F", background: "#EF486F14" }}
                >
                  WORKFLOW ENGINE
                </span>
                <h3 className="font-bold text-[#1a1d23] text-xl mt-3 mb-2">
                  Build automations in minutes
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed max-w-sm">
                  Drag-and-drop your way to powerful multi-step workflows.
                  Connect 400+ integrations with no code required.
                </p>
              </div>
              <div
                className="relative z-10 flex-1 mx-5 mb-5 rounded-xl overflow-hidden border border-[#e5e7eb] bg-[#fafafa] flex items-center justify-center"
                style={{ minHeight: 220 }}
              >
                <div className="absolute inset-0 dotted-grid-light opacity-80" />
                <img
                  src={workflowDiagram}
                  alt="Workflow diagram"
                  className="relative z-10 w-full h-full object-cover object-center"
                />
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #EF486F60, transparent)",
                }}
              />
            </div>
            <div className="bento-card relative flex flex-col reveal reveal-delay-1">
              <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
              <div className="relative z-10 p-5 flex flex-col h-full">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-fit"
                  style={{ color: "#7c3aed", background: "#7c3aed14" }}
                >
                  AGENT RUNTIME
                </span>
                <h3 className="font-bold text-[#1a1d23] text-base mt-3 mb-1.5">
                  AI Agents that act
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed mb-4">
                  Deploy autonomous agents that reason, decide, and execute.
                </p>
                <div className="mt-auto rounded-xl bg-[#F1F2F4] border border-[#e5e7eb] p-3 overflow-hidden">
                  <pre className="font-mono-tech text-[10px] text-[#374151] leading-relaxed whitespace-pre">{`agent.run({
  trigger: "new_lead",
  model: "gpt-4o",
  tools: ["crm","email"]
})`}</pre>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #7c3aed60, transparent)",
                }}
              />
            </div>
            <div className="bento-card relative flex flex-col reveal reveal-delay-2">
              <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
              <div className="relative z-10 p-5 flex flex-col h-full">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-fit"
                  style={{ color: "#16a34a", background: "#16a34a14" }}
                >
                  SELF-HEALING
                </span>
                <h3 className="font-bold text-[#1a1d23] text-base mt-3 mb-1.5">
                  Zero downtime
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed mb-auto">
                  Workflows auto-recover. AI patches failures in real-time.
                </p>
                <div className="mt-4 pt-3 border-t border-[#F1F2F4]">
                  <div
                    className="font-bold text-4xl tracking-tight"
                    style={{ color: "#16a34a" }}
                  >
                    99.98%
                  </div>
                  <div className="font-mono-tech text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">
                    Uptime SLA
                  </div>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #16a34a60, transparent)",
                }}
              />
            </div>
            <div className="bento-card md:row-span-2 relative flex flex-col reveal reveal-delay-1">
              <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
              <div className="relative z-10 p-5">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded"
                  style={{ color: "#EF486F", background: "#EF486F14" }}
                >
                  LIVE AGENTS
                </span>
                <h3 className="font-bold text-[#1a1d23] text-base mt-3 mb-1.5">
                  Monitor every node
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed">
                  Real-time logs, metrics, and anomaly alerts across all
                  workflows.
                </p>
              </div>
              <div
                className="relative z-10 mx-5 mb-5 flex-1 rounded-xl overflow-hidden border border-[#e5e7eb] flex items-start justify-center bg-white shadow-sm"
                style={{ minHeight: 160 }}
              >
                <img
                  src={workflowCard}
                  alt="Agent card"
                  className="w-full object-contain p-4"
                />
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #EF486F60, transparent)",
                }}
              />
            </div>
            <div className="bento-card relative flex flex-col reveal reveal-delay-2">
              <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
              <div className="relative z-10 p-5 flex flex-col h-full">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-fit"
                  style={{ color: "#f59e0b", background: "#f59e0b14" }}
                >
                  DATA TRANSFORM
                </span>
                <h3 className="font-bold text-[#1a1d23] text-base mt-3 mb-1.5">
                  LLM-powered mapping
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed mb-4">
                  Transform, enrich, and normalize data as it flows.
                </p>
                <div className="mt-auto rounded-xl bg-[#F1F2F4] border border-[#e5e7eb] p-3">
                  <pre className="font-mono-tech text-[10px] text-[#374151] leading-relaxed whitespace-pre">{`transform({
  input: rawLead,
  prompt: "normalize",
  output: CRMSchema
})`}</pre>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #f59e0b60, transparent)",
                }}
              />
            </div>
            <div className="bento-card relative flex flex-col reveal reveal-delay-3">
              <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
              <div className="relative z-10 p-5 flex flex-col h-full">
                <span
                  className="font-mono-tech text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded w-fit"
                  style={{ color: "#0ea5e9", background: "#0ea5e914" }}
                >
                  ENTERPRISE
                </span>
                <h3 className="font-bold text-[#1a1d23] text-base mt-3 mb-1.5">
                  SOC 2 certified
                </h3>
                <p className="text-[#6b7280] text-sm leading-relaxed mb-auto">
                  End-to-end encryption, RBAC, audit logs, SSO/SAML.
                </p>
                <div className="mt-4 pt-3 border-t border-[#F1F2F4]">
                  <div
                    className="font-mono-tech font-bold text-3xl tracking-tight"
                    style={{ color: "#0ea5e9" }}
                  >
                    SOC 2
                  </div>
                  <div className="font-mono-tech text-[11px] text-[#9ca3af] uppercase tracking-wider mt-0.5">
                    Type II Certified
                  </div>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{
                  background:
                    "linear-gradient(90deg, #0ea5e960, transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </section>
      <section
        id="solutions"
        className="py-24 bg-[#F1F2F4] relative overflow-hidden"
      >
        <div className="absolute inset-0 dotted-grid-light opacity-70 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              How it works
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-[#1a1d23] tracking-tight">
              Go live in minutes, not months
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${i + 1} bento-card p-8 relative`}
              >
                <div className="absolute inset-0 dotted-grid-light opacity-60 pointer-events-none rounded-2xl" />
                <div className="relative z-10">
                  <div
                    className="font-mono-tech text-5xl font-black mb-4"
                    style={{ color: "#EF486F", opacity: 0.13 }}
                  >
                    {s.num}
                  </div>
                  <h3 className="font-bold text-[#1a1d23] text-xl mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[#6b7280] leading-relaxed text-sm">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* <section className="py-16 bg-white border-y border-[#F1F2F4] relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              Live Execution
            </span>
            <h2 className="mt-2 text-3xl font-bold text-[#1a1d23]">
              See it in action
            </h2>
          </div>
          <div className="reveal bento-card p-6 relative">
            <div className="absolute inset-0 dotted-grid-light opacity-70 pointer-events-none rounded-2xl" />
            <div className="relative z-10 flex items-center gap-3 overflow-x-auto pb-2">
              <WorkflowNode
                icon="⚡"
                label="HubSpot"
                sublabel="NEW LEAD"
                color="#EF486F"
              />
              <Arrow />
              <WorkflowNode
                icon="🤖"
                label="AI Enrich"
                sublabel="LLM-NODE"
                color="#7c3aed"
              />
              <Arrow />
              <WorkflowNode
                icon="💬"
                label="Slack"
                sublabel="NOTIFY"
                color="#4ade80"
              />
              <Arrow />
              <WorkflowNode
                icon="✅"
                label="Linear"
                sublabel="TASK"
                color="#60a5fa"
              />
              <Arrow />
              <WorkflowNode
                icon="📧"
                label="Gmail"
                sublabel="EMAIL"
                color="#f97316"
              />
            </div>
            <div className="relative z-10 mt-4 flex items-center gap-4 pt-3 border-t border-[#F1F2F4]">
              <span className="font-mono-tech text-[11px] text-[#9ca3af] uppercase tracking-wide">
                EXEC_TIME: 142ms
              </span>
              <span className="status-active">
                <span className="status-dot" />
                Running
              </span>
              <span className="ml-auto font-mono-tech text-[11px] text-[#9ca3af]">
                847 tasks · this week
              </span>
            </div>
          </div>
        </div>
      </section> */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-light opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-[#1a1d23] tracking-tight">
              Loved by operations teams
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`bento-card p-7 reveal reveal-delay-${i + 1}`}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg
                      key={j}
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="#EF486F"
                    >
                      <path d="M7 1L8.5 4.5L12.5 5L9.75 7.5L10.5 11.5L7 9.5L3.5 11.5L4.25 7.5L1.5 5L5.5 4.5L7 1Z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#374151] text-sm leading-relaxed mb-5">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "#EF486F" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1a1d23] text-sm">
                      {t.name}
                    </div>
                    <div className="font-mono-tech text-[10px] text-[#9ca3af] uppercase tracking-wide">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        id="pricing"
        className="py-24 bg-[#F1F2F4] relative overflow-hidden"
      >
        <div className="absolute inset-0 dotted-grid-light opacity-60 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              Pricing
            </span>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold text-[#1a1d23] tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-lg text-[#6b7280]">
              Start free. Upgrade when you need to.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((p, i) => (
              <div
                key={i}
                className={`bento-card p-8 relative reveal reveal-delay-${
                  i + 1
                } ${p.highlight ? "ring-2 ring-[#EF486F]/40 scale-[1.03]" : ""}`}
              >
                <div className="absolute inset-0 dotted-grid-light opacity-50 pointer-events-none rounded-2xl" />
                {p.highlight && (
                  <div
                    className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-mono-tech text-xs font-bold text-white uppercase tracking-wide"
                    style={{ background: "#EF486F" }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="relative z-10">
                  <h3 className="font-bold text-[#1a1d23] text-lg mb-1">
                    {p.name}
                  </h3>
                  <div className="mb-2 flex items-end gap-1">
                    <span className="font-mono-tech text-4xl font-black text-[#1a1d23]">
                      {p.price}
                    </span>
                    {p.price !== "Custom" && (
                      <span className="text-[#9ca3af] text-sm mb-1">/mo</span>
                    )}
                  </div>
                  <p className="text-[#6b7280] text-sm mb-5">{p.desc}</p>
                  <ul className="space-y-2.5 mb-7">
                    {p.features.map((f, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-2 text-sm text-[#374151]"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                        >
                          <path
                            d="M12.5 3.5L5.5 10.5L2.5 7.5"
                            stroke="#EF486F"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    className={`block text-center px-6 py-3 rounded-xl text-sm font-semibold transition-all no-underline ${
                      p.highlight
                        ? "text-white hover:opacity-90"
                        : "text-[#1a1d23] border border-[#e5e7eb] hover:bg-[#F1F2F4]"
                    }`}
                    style={p.highlight ? { background: "#EF486F" } : {}}
                  >
                    {p.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-light opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="text-center mb-14 reveal">
            <span className="font-mono-tech text-xs font-bold text-[#EF486F] uppercase tracking-widest">
              FAQ
            </span>
            <h2 className="mt-3 text-4xl font-bold text-[#1a1d23]">
              Common questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`bento-card reveal reveal-delay-${(i % 3) + 1} overflow-hidden`}
              >
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-[#fafafa] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-[#1a1d23] text-sm pr-4">
                    {faq.q}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}
                  >
                    <path
                      d="M10 4v12M4 10h12"
                      stroke="#EF486F"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-[#6b7280] text-sm leading-relaxed border-t border-[#F1F2F4] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 bg-[#111318] relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-dark opacity-80 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <CircuitBackground variant="dark" scrollProgress={scrollProgress} />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(239,72,111,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center reveal">
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
            Start automating today.{" "}<br></br>
            <span className="gradient-text">for FREE.</span>
          </h2>
          <p className="text-lg text-[#9ca3af] max-w-xl mx-auto mb-10">
            Join 10,000+ companies that use Hyperchain to automate their most
            important workflows.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="px-8 py-4 text-base font-semibold text-white rounded-xl hover:opacity-90 transition-all no-underline inline-block"
              style={{
                background: "#EF486F",
                boxShadow: "0 8px 40px rgba(239,72,111,0.4)",
              }}
            >
              Get started — it's free
            </a>
            <a
              href="#"
              className="px-8 py-4 text-base font-semibold text-white rounded-xl border border-white/20 hover:bg-white/10 transition-all no-underline inline-block"
            >
              Talk to sales
            </a>
          </div>
          {/* <p className="mt-8 font-mono-tech text-xs text-[#6b7280] uppercase tracking-widest">
            No credit card · SOC 2 · 99.98% uptime
          </p> */}
        </div>
      </section>
      <footer className="bg-[#0d1014] py-16 relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid-dark opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#EF486F" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M9 2L4 9h5L4 16l10-9H9L14 2z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="font-bold text-lg text-white">
                  Hyperchain
                </span>
              </div>
              <p className="text-[#6b7280] text-sm leading-relaxed">
                AI-powered workflow automation for modern teams.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Integrations", "Pricing", "Changelog", "Roadmap"],
              },
              {
                title: "Solutions",
                links: ["RevOps", "Marketing", "Engineering", "Finance", "HR"],
              },
              {
                title: "Resources",
                links: ["Docs", "Blog", "Tutorials", "Community", "Status"],
              },
              {
                title: "Company",
                links: ["About", "Careers", "Privacy", "Terms", "Contact"],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="font-mono-tech text-[11px] font-bold text-[#555] uppercase tracking-widest mb-4">
                  {col.title}
                </div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-[#6b7280] text-sm hover:text-white transition-colors no-underline"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/6 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-mono-tech text-[11px] text-[#444] uppercase tracking-wider">
              © 2025 Hyperchain, Inc. All rights reserved.
            </p>
            <div className="flex gap-4">
              {["Twitter", "GitHub", "LinkedIn"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[#555] text-sm hover:text-white transition-colors no-underline"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

