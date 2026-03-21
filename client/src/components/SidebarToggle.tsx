import { TbLayoutSidebarRightExpand, TbLayoutSidebarRightCollapse } from 'react-icons/tb';
import { useSidebar } from './SidebarContext';

export function SidebarToggle() {
    const { collapsed, toggle } = useSidebar();
    return (
        <button
            onClick={toggle}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
            {collapsed
                ? <TbLayoutSidebarRightCollapse className="w-5 h-5" />
                : <TbLayoutSidebarRightExpand className="w-5 h-5" />
            }
        </button>
    );
}
