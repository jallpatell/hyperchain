import { Link, useLocation } from "wouter";
import { 
  Workflow, 
  Activity, 
  Key, 
  Settings, 
  Plus, 
  Layout
} from "lucide-react";
import { Button } from "./ui/button";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { icon: Workflow, label: "Workflows", href: "/" },
    { icon: Activity, label: "Executions", href: "/executions" },
    { icon: Key, label: "Credentials", href: "/credentials" },
    // { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col sticky top-0">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Layout className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">FlowBuoy</h1>
        </div>
      </div>

      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (location !== "/" && item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? "bg-primary/10 text-primary hover:bg-primary/15" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <Link href="/">
           <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                JD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Jane Doe</span>
                <span className="text-xs text-muted-foreground">Admin Workspace</span>
              </div>
           </div>
        </Link>
      </div>
    </div>
  );
}
