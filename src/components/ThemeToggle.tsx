/**
 * ThemeToggle - Button to toggle dark/light mode
 */

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, setTheme, isDark } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                    {isDark ? (
                        <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    ) : (
                        <Sun className="h-4 w-4 text-slate-600" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 rounded-xl">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className={theme === 'light' ? 'bg-slate-100 dark:bg-slate-800' : ''}
                >
                    <Sun className="mr-2 h-4 w-4" />
                    สว่าง
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className={theme === 'dark' ? 'bg-slate-100 dark:bg-slate-800' : ''}
                >
                    <Moon className="mr-2 h-4 w-4" />
                    มืด
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className={theme === 'system' ? 'bg-slate-100 dark:bg-slate-800' : ''}
                >
                    <Monitor className="mr-2 h-4 w-4" />
                    ระบบ
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
