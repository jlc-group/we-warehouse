import React from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Button } from '@/components/ui/button';
import { LogOut, Home, ArrowLeft, User, Package, ScanLine, ClipboardList, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

interface MobileLayoutProps {
    children: React.ReactNode;
    title?: string;
    showBack?: boolean;
    hideBottomNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
    children,
    title = 'WMS Mobile',
    showBack = false,
    hideBottomNav = false
}) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        signOut();
        navigate('/auth');
    };

    const navItems = [
        { icon: Home, label: 'หน้าหลัก', path: '/mobile' },
        { icon: Package, label: 'งานของฉัน', path: '/mobile/my-tasks' },
        { icon: ScanLine, label: 'ค้นหา', path: '/mobile/lookup' },
        { icon: ClipboardList, label: 'นับสต็อก', path: '/mobile/count' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
            {/* Mobile Header — glassmorphism */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-50">
                {/* Safe area for notch */}
                <div className="pt-[env(safe-area-inset-top)]" />
                <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        {showBack ? (
                            <button
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                                onClick={() => navigate('/mobile')}
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-700" />
                            </button>
                        ) : location.pathname !== '/mobile' ? (
                            <button
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                                onClick={() => navigate('/mobile')}
                            >
                                <Home className="h-5 w-5 text-slate-700" />
                            </button>
                        ) : null}
                        {title && (
                            <h1 className="text-base font-bold text-slate-800 truncate max-w-[200px]">
                                {title}
                            </h1>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                            <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-700" />
                            </div>
                            <span className="truncate max-w-[80px]">
                                {user?.full_name || 'User'}
                            </span>
                        </div>
                        <button
                            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-red-50 active:scale-95 transition-all"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 py-3 overflow-y-auto" style={{ paddingBottom: hideBottomNav ? '16px' : '80px' }}>
                <div className="max-w-md mx-auto w-full">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation Bar */}
            {!hideBottomNav && (
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
                    <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
                        {navItems.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all active:scale-95 min-w-[60px] ${active
                                            ? 'text-blue-600'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <div className={`p-1 rounded-lg transition-all ${active ? 'bg-blue-100' : ''}`}>
                                        <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : ''}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : ''}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Safe area for home indicator */}
                    <div className="pb-[env(safe-area-inset-bottom)]" />
                </nav>
            )}

            <Toaster />
        </div>
    );
};
