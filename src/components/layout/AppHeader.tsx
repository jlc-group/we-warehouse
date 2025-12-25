/**
 * AppHeader - Header หลักของแอพ (Redesigned)
 */

import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Settings,
  User,
  LogOut,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { useToast } from '@/hooks/use-toast';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppHeader({
  title = 'WE Warehouse',
  subtitle,
  showSearch = true,
  onRefresh,
  isRefreshing = false
}: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    signOut();
    toast({
      title: 'ออกจากระบบแล้ว',
      description: 'กรุณาเข้าสู่ระบบใหม่เพื่อใช้งาน',
    });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 border-b-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 shadow-sm transition-colors">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm" />

        <Separator orientation="vertical" className="h-6 bg-slate-200" />

        <div className="hidden md:block">
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center Section - Search */}
      {showSearch && (
        <div className="flex-1 max-w-lg mx-auto hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="ค้นหาสินค้า, Location, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Notifications - Using real-time alerts */}
        <NotificationCenter />

        {/* Dark Mode Toggle */}
        <ThemeToggle />

        <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-700 hidden md:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 h-9 px-3 rounded-lg border-slate-200 hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:inline text-sm font-medium text-slate-700">
                {user?.email?.split('@')[0] || 'Guest'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-200">
            <DropdownMenuLabel className="py-3">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">{user?.email || 'Guest'}</span>
                <span className="text-xs font-normal text-slate-500">{user?.role || 'User'}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2.5 cursor-pointer hover:bg-slate-50 rounded-lg mx-1">
              <User className="mr-2 h-4 w-4 text-slate-500" />
              <span className="text-slate-700">โปรไฟล์</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2.5 cursor-pointer hover:bg-slate-50 rounded-lg mx-1">
              <Settings className="mr-2 h-4 w-4 text-slate-500" />
              <span className="text-slate-700">ตั้งค่า</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="py-2.5 cursor-pointer hover:bg-red-50 rounded-lg mx-1 text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-medium">ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
