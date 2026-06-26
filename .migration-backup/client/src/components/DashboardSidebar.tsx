import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
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
  AlertCircle,
  CreditCard,
  ShieldCheck,
  FileText,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { Driver } from '@shared/schema';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';

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
        { icon: BarChart3, label: 'My Reviews', path: '/driver/reviews' },
        { icon: DollarSign, label: 'Earnings', path: '/driver/earnings' },
        { icon: History, label: 'History', path: '/driver/history' },
        { icon: Settings, label: 'Settings', path: '/driver/settings' },
      ];
    }

    if (role === 'client') {
      return [
        { icon: MapPin, label: 'Book Driver', path: '/client/dashboard' },
        { icon: Car, label: 'Active Booking', path: '/client/active' },
        { icon: History, label: 'My Bookings', path: '/client/bookings' },
        { icon: Settings, label: 'Settings', path: '/client/settings' },
      ];
    }

    // Admin
    const baseAdminItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: Car, label: 'Bookings', path: '/admin/bookings' },
      { icon: CreditCard, label: 'Transactions', path: '/admin/transactions' },
      { icon: AlertCircle, label: 'Disputes', path: '/admin/disputes' },
      { icon: ShieldCheck, label: 'NIN Verifications', path: '/admin/nin-verifications' },
      { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    // Add Admin Management for super admins only
    const adminProfile = profile as any;
    if (adminProfile?.role === 'super_admin') {
      baseAdminItems.splice(6, 0, { icon: Users, label: 'Admin Management', path: '/admin/admins' });
    }

    return baseAdminItems;
  };

  const menuItems = getMenuItems();
  const driver = profile as Driver;
  
  // Check if user is super admin
  const adminProfile = profile as any;
  const isSuperAdmin = role === 'admin' && adminProfile?.role === 'super_admin';
  
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

  const getProfilePictureUrl = () => {
    if (!profile) return undefined;
    if ('profile_picture_url' in profile) return profile.profile_picture_url || undefined;
    return undefined;
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo Section */}
      <SidebarHeader className="p-6 border-b border-sidebar-border group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Link href={role === 'admin' ? '/admin/dashboard' : role === 'driver' ? '/driver/dashboard' : '/client/dashboard'}>
          <Logo size="sm" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Profile Section */}
        <div className="p-6 border-b border-sidebar-border group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 mb-4 group-data-[collapsible=icon]:mb-0">
            <Avatar className="h-12 w-12 border-2 border-primary/10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <AvatarImage 
                src={getProfilePictureUrl()} 
                alt={getProfileName()} 
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getProfileInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-semibold text-sidebar-foreground truncate">
                {getProfileName()}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>

          {/* Driver Online/Offline Toggle */}
          {role === 'driver' && onToggleOnline && (
            <div className="flex items-center justify-between p-3 rounded-md bg-sidebar-accent group-data-[collapsible=icon]:hidden">
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
        <div className="p-4 space-y-1 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Logout & Theme */}
      <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between mb-2 group-data-[collapsible=icon]:hidden">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        
        {/* Hide Terms and Privacy for Super Admin */}
        {!isSuperAdmin && (
          <div className="space-y-1">
            <TermsOfService 
              trigger={
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-[13px]"
                  data-testid="button-terms-sidebar"
                >
                  <FileText className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Terms of Service</span>
                </Button>
              }
            />

            <PrivacyPolicy 
              trigger={
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-[13px]"
                  data-testid="button-privacy-sidebar"
                >
                  <Shield className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Privacy Policy</span>
                </Button>
              }
            />
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
