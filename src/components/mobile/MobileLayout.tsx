import React from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Button } from '@/components/ui/button';
import { LogOut, Home, ArrowLeft, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

interface MobileLayoutProps {
    children: React.ReactNode;
    title?: string;
    showBack?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
    children,
    title = 'WMS Mobile',
    showBack = false
}) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        signOut();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Mobile Header */}
            <header className="bg-primary text-primary-foreground p-3 shadow-md sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {showBack && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary-foreground hover:bg-primary/80 -ml-2"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        )}
                        {!showBack && location.pathname !== '/mobile' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary-foreground hover:bg-primary/80 -ml-2"
                                onClick={() => navigate('/mobile')}
                            >
                                <Home className="h-6 w-6" />
                            </Button>
                        )}
                        <h1 className="text-lg font-bold truncate max-w-[200px]">{title}</h1>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="text-xs bg-primary-foreground/20 px-2 py-1 rounded-full flex items-center gap-1 mr-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">{user?.full_name || 'User'}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary-foreground hover:bg-red-500/20"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-3 overflow-y-auto">
                <div className="max-w-md mx-auto w-full">
                    {children}
                </div>
            </main>

            <Toaster />
        </div>
    );
};
