import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { ThemeToggle } from './ThemeToggle';

interface DashboardLayoutProps {
  role: 'driver' | 'client' | 'admin';
  onLogout: () => void;
  onToggleOnline?: (online: boolean) => void;
  isOnline?: boolean;
  children: React.ReactNode;
}

export function DashboardLayout({ role, onLogout, onToggleOnline, isOnline, children }: DashboardLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <DashboardSidebar 
          role={role} 
          onLogout={onLogout}
          onToggleOnline={onToggleOnline}
          isOnline={isOnline}
        />
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
