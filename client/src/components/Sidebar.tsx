import { Link, useLocation } from 'wouter';
import { Workflow, Activity, Key, Settings, Container } from 'lucide-react';
import { UserButton } from '@clerk/react';
import { TbLayoutSidebarRightExpand, TbLayoutSidebarRightCollapse } from 'react-icons/tb';
import { useSidebar } from './SidebarContext';

export function Sidebar() {
    const [location] = useLocation();
    const { collapsed, toggle } = useSidebar();

    const navItems = [
        { icon: Workflow, label: 'Workflows', href: '/workflows' },
        { icon: Activity, label: 'Executions', href: '/executions' },
        { icon: Container, label: 'Templates', href: '/templates' },
        { icon: Key, label: 'Credentials', href: '/credentials' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    return (
        <div
            className={`${
                collapsed ? 'w-16' : 'w-64'
            } h-screen bg-card border-r border-border flex flex-col sticky top-0 transition-all duration-300 overflow-hidden shrink-0`}
        >
            {/* Header */}
            <div className={`h-16 border-b border-border flex items-center shrink-0 ${collapsed ? 'justify-center px-4' : 'px-5'}`}>
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <img src="favicon.png" alt="logo" className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <h1 className="font-bold text-xl tracking-tight whitespace-nowrap ml-3">HyperChain</h1>
                )}
            </div>

            {/* Nav */}
            <div className="flex-1 p-2 overflow-hidden">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            location === item.href ||
                            (location !== '/' && item.href !== '/' && location.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    title={collapsed ? item.label : undefined}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                                        collapsed ? 'justify-center' : ''
                                    } ${
                                        isActive
                                            ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                                    {!collapsed && item.label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border shrink-0">
                <button
                    onClick={toggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-1 ${collapsed ? 'justify-center' : ''}`}
                >
                    {collapsed
                        ? <TbLayoutSidebarRightCollapse className="w-5 h-5 shrink-0" />
                        : <>
                            <TbLayoutSidebarRightExpand className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">Collapse</span>
                          </>
                    }
                </button>
                <div className={`flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/50 ${collapsed ? 'justify-center' : ''}`}>
                    <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
                    {!collapsed && (
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">Account</span>
                            <span className="text-xs text-muted-foreground">Manage profile</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
