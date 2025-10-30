import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  LayoutDashboard,
  MapPin,
  History,
  Settings,
  LogOut,
  DollarSign,
  Users,
  Car,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { Driver } from '@shared/schema';
import { ThemeToggle } from './ThemeToggle';

interface DashboardSidebarProps {
  role: 'driver' | 'client' | 'admin';
  onLogout: () => void;
  onToggleOnline?: (online: boolean) => void;
  isOnline?: boolean;
}

export function DashboardSidebar({ role, onLogout, onToggleOnline, isOnline }: DashboardSidebarProps) {
  const [location] = useLocation();
  const { profile } = useAuthStore();

  const getMenuItems = () => {
    if (role === 'driver') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/driver/dashboard' },
        { icon: Car, label: 'Active Bookings', path: '/driver/bookings' },
        { icon: DollarSign, label: 'Earnings', path: '/driver/earnings' },
        { icon: History, label: 'History', path: '/driver/history' },
        { icon: Settings, label: 'Settings', path: '/driver/settings' },
      ];
    }

    if (role === 'client') {
      return [
        { icon: MapPin, label: 'Book Driver', path: '/client/dashboard' },
        { icon: Car, label: 'My Bookings', path: '/client/bookings' },
        { icon: History, label: 'History', path: '/client/history' },
        { icon: Settings, label: 'Settings', path: '/client/settings' },
      ];
    }

    // Admin
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: Users, label: 'Drivers', path: '/admin/drivers' },
      { icon: Users, label: 'Clients', path: '/admin/clients' },
      { icon: Car, label: 'Bookings', path: '/admin/bookings' },
      { icon: DollarSign, label: 'Transactions', path: '/admin/transactions' },
      { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    ];
  };

  const menuItems = getMenuItems();
  const driver = profile as Driver;
  
  const getProfileName = () => {
    if (!profile) return 'User';
    if ('full_name' in profile) return profile.full_name;
    if ('name' in profile) return profile.name;
    return 'User';
  };

  const getProfileInitials = () => {
    const name = getProfileName();
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  };

  return (
    <div className="h-screen w-64 bg-sidebar border-r flex flex-col">
      {/* Profile Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getProfileInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sidebar-foreground truncate">
              {getProfileName()}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>

        {/* Driver Online/Offline Toggle */}
        {role === 'driver' && onToggleOnline && (
          <div className="flex items-center justify-between p-3 rounded-md bg-sidebar-accent">
            <Label htmlFor="online-toggle" className="text-sm font-medium cursor-pointer">
              {isOnline ? 'Online' : 'Offline'}
            </Label>
            <Switch
              id="online-toggle"
              checked={isOnline}
              onCheckedChange={onToggleOnline}
              data-testid="toggle-online-status"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-3"
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              asChild
            >
              <Link href={item.path}>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Logout & Theme */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
