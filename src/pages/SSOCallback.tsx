/**
 * SSO Callback Page — รับ token + user จาก backend redirect ผ่าน URL hash
 * แล้ว save ใน localStorage ตาม format ที่ AuthContextSimple ใช้
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const USER_KEY = 'warehouse_user';
const TOKEN_KEY = 'warehouse_token';

export default function SSOCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const hash = window.location.hash.replace(/^#/, '');
            if (!hash) {
                setError('ไม่พบข้อมูล token');
                return;
            }

            const params = new URLSearchParams(hash);
            const token = params.get('token');
            const userId = params.get('userId');
            const username = params.get('username');

            if (!token || !userId || !username) {
                setError('ข้อมูล SSO ไม่ครบ');
                return;
            }

            let allowedPages: string[] = [];
            try {
                allowedPages = JSON.parse(params.get('allowedPages') || '[]');
            } catch {
                allowedPages = [];
            }

            const user = {
                id: userId,
                username,
                email: params.get('email') || '',
                full_name: decodeURIComponent(params.get('fullName') || ''),
                role: params.get('role') || 'staff',
                department: decodeURIComponent(params.get('department') || ''),
                allowed_pages: allowedPages,
                is_active: true,
            };

            // Save in same format AuthContextSimple expects
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(TOKEN_KEY, token);

            // Clean hash + force reload to home (so AuthProvider re-init)
            window.history.replaceState(null, '', window.location.pathname);
            window.location.href = '/';
        } catch (err) {
            console.error('SSO callback error:', err);
            setError(err instanceof Error ? err.message : 'SSO callback failed');
        }
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">❌</div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">SSO Login ล้มเหลว</h1>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/auth')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        กลับไปหน้า Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-700">กำลัง login ผ่าน JLC SSO...</p>
            </div>
        </div>
    );
}
