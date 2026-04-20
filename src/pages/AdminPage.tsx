/**
 * Admin Page - จัดการผู้ใช้และสิทธิ์
 * UI inspired by WeOrder Super Admin Panel
 * Matrix table for Roles & Departments page permissions
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Shield, Users, Building2, Grid3X3, Plus, Pencil, Trash2,
    Check, X, RefreshCw, Save, Eye, EyeOff, Key,
    CheckCircle2, XCircle, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { localDb } from '@/integrations/local/client';

import { getBackendRoot } from '@/lib/apiConfig';
const API_BASE = getBackendRoot();

// ============== Types ==============
interface Role {
    id: string;
    code: string;
    name: string;
    allowed_pages: string[];
}

interface Department {
    id: string;
    code: string;
    name: string;
    allowed_pages: string[];
}

interface UserItem {
    id: string;
    username: string;
    email: string;
    full_name: string;
    is_active: boolean;
    roles: { id: string; code: string; name: string }[];
    department: { id: string; code: string; name: string } | null;
    legacy_role?: string;
    legacy_role_level?: number;
    last_login?: string;
    employee_code?: string;
}

interface AvailablePage {
    key: string;
    name: string;
    icon: string;
}

// ============== API Helpers ==============
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('warehouse_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiPost<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiPut<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiDelete(path: string): Promise<void> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE', headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
}

// ============== Permission Icon ==============
function PermIcon({ enabled, onClick }: { enabled: boolean; onClick?: () => void }) {
    if (enabled) {
        return (
            <button onClick={onClick} className="group flex items-center justify-center w-8 h-8 rounded-full transition-all hover:bg-green-50 dark:hover:bg-green-950">
                <CheckCircle2 className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
            </button>
        );
    }
    return (
        <button onClick={onClick} className="group flex items-center justify-center w-8 h-8 rounded-full transition-all hover:bg-gray-100 dark:hover:bg-gray-800">
            <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform" />
        </button>
    );
}

// ============== Main Admin Component ==============
export default function AdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'roles'>('users');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [availablePages, setAvailablePages] = useState<AvailablePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Use localDb directly — no JWT needed
            const [usersRes, rolesRes, deptsRes] = await Promise.all([
                localDb.from('users').select('*').order('email'),
                localDb.from('roles').select('*').order('code'),
                localDb.from('departments').select('*').order('name'),
            ]);

            const usersData: UserItem[] = (usersRes.data || []).map((u: any) => ({
                id: u.id,
                email: u.email || '',
                full_name: u.full_name || '',
                username: u.username || '',
                is_active: u.is_active ?? true,
                department: u.department ? { id: '', name: u.department } : null,
                roles: u.role ? [{ id: '', code: u.role, name: u.role }] : [],
                last_login: u.last_login || null,
            }));

            const parsePages = (val: any): string[] => {
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try {
                        // Handle JSON array: ["a","b"] or PostgreSQL array: {"a","b"}
                        const cleaned = val.replace(/^\{/, '[').replace(/\}$/, ']');
                        const parsed = JSON.parse(cleaned);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch { return []; }
                }
                return [];
            };

            const rolesData: Role[] = (rolesRes.data || []).map((r: any) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                allowed_pages: parsePages(r.allowed_pages),
            }));

            const deptsData: Department[] = (deptsRes.data || []).map((d: any) => ({
                id: d.id,
                code: d.code,
                name: d.name,
                allowed_pages: parsePages(d.allowed_pages),
            }));

            const pagesData: AvailablePage[] = [
                { key: 'dashboard', name: 'ภาพรวม', icon: '' },
                { key: 'inventory', name: 'คลังสินค้า', icon: '' },
                { key: 'locations', name: 'จัดการ Location', icon: '' },
                { key: 'orders', name: 'คำสั่งซื้อ', icon: '' },
                { key: 'picking', name: 'หยิบสินค้า', icon: '' },
                { key: 'packing', name: 'แพ็คสินค้า', icon: '' },
                { key: 'shipping', name: 'จัดส่ง', icon: '' },
                { key: 'assignment', name: 'กระจายงาน', icon: '' },
                { key: 'finance', name: 'การเงิน', icon: '' },
                { key: 'products', name: 'สินค้า', icon: '' },
                { key: 'transfers', name: 'โอนย้าย', icon: '' },
                { key: 'reports', name: 'รายงาน', icon: '' },
                { key: 'admin', name: 'จัดการผู้ใช้', icon: '' },
            ];

            setUsers(usersData);
            setRoles(rolesData);
            setDepartments(deptsData);
            setAvailablePages(pagesData);
        } catch (err: any) {
            setError(err.message);
            toast.error('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const tabs = [
        { key: 'users' as const, label: 'ผู้ใช้งาน', icon: Users, count: users.length },
        { key: 'departments' as const, label: 'แผนก', icon: Building2, count: departments.length },
        { key: 'roles' as const, label: 'Role & Permissions', icon: Grid3X3, count: roles.length },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-[1400px] mx-auto p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">จัดการผู้ใช้และสิทธิ์</h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Super Admin Panel</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="text-gray-500">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Content */}
                {activeTab === 'users' && (
                    <UsersTab users={users} roles={roles} departments={departments} onRefresh={loadData} />
                )}
                {activeTab === 'departments' && (
                    <DepartmentsMatrix
                        items={departments}
                        availablePages={availablePages}
                        onRefresh={loadData}
                        type="departments"
                    />
                )}
                {activeTab === 'roles' && (
                    <DepartmentsMatrix
                        items={roles}
                        availablePages={availablePages}
                        onRefresh={loadData}
                        type="roles"
                    />
                )}
            </div>
        </div>
    );
}

// ============== Matrix Table (for Roles & Departments) ==============
function DepartmentsMatrix({
    items,
    availablePages,
    onRefresh,
    type,
}: {
    items: (Role | Department)[];
    availablePages: AvailablePage[];
    onRefresh: () => void;
    type: 'roles' | 'departments';
}) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPages, setEditPages] = useState<string[]>([]);
    const [editName, setEditName] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newPages, setNewPages] = useState<string[]>([]);

    const tableName = type === 'roles' ? 'roles' : 'departments';
    const titleLabel = type === 'roles' ? 'Roles & Page Permissions' : 'แผนก & สิทธิ์การเข้าถึงหน้า';
    const addLabel = type === 'roles' ? '+ เพิ่ม Role' : '+ เพิ่มแผนก';
    const firstColLabel = type === 'roles' ? 'ROLE' : 'แผนก';

    const startEdit = (item: Role | Department) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditPages([...item.allowed_pages]);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditPages([]);
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            await localDb.from(tableName).update({ name: editName, allowed_pages: JSON.stringify(editPages) }).eq('id', editingId);
            toast.success('บันทึกสำเร็จ');
            cancelEdit();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCreate = async () => {
        try {
            await localDb.from(tableName).insert({
                code: newCode,
                name: newName,
                allowed_pages: JSON.stringify(newPages),
            });
            toast.success('สร้างสำเร็จ');
            setShowCreate(false);
            setNewCode(''); setNewName(''); setNewPages([]);
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`ยืนยันลบ "${name}"?`)) return;
        try {
            await localDb.from(tableName).delete().eq('id', id);
            toast.success('ลบสำเร็จ');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const togglePage = (pageKey: string) => {
        if (editPages.includes(pageKey)) {
            setEditPages(editPages.filter(p => p !== pageKey));
        } else {
            setEditPages([...editPages, pageKey]);
        }
    };

    const toggleNewPage = (pageKey: string) => {
        if (newPages.includes(pageKey)) {
            setNewPages(newPages.filter(p => p !== pageKey));
        } else {
            setNewPages([...newPages, pageKey]);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">{titleLabel}</h3>
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {addLabel}
                </Button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900">
                    <div className="flex items-center gap-3 mb-3">
                        <Input
                            placeholder="รหัส (เช่น manager)"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            className="w-48 h-9 text-sm"
                        />
                        <Input
                            placeholder="ชื่อ (เช่น ผู้จัดการ)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-48 h-9 text-sm"
                        />
                        <Button size="sm" onClick={handleCreate} disabled={!newCode || !newName} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Save className="h-3 w-3 mr-1" /> บันทึก
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>ยกเลิก</Button>
                    </div>
                    {/* Page toggles for new item */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    {availablePages.map(p => (
                                        <th key={p.key} className="px-2 py-1 text-center">
                                            <span className="text-xs text-gray-500 uppercase">{p.name}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {availablePages.map(p => (
                                        <td key={p.key} className="px-2 py-1 text-center">
                                            <PermIcon enabled={newPages.includes(p.key)} onClick={() => toggleNewPage(p.key)} />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider min-w-[140px] sticky left-0 bg-white dark:bg-gray-900 z-10">
                                {firstColLabel}
                            </th>
                            {availablePages.map(page => (
                                <th key={page.key} className="px-2 py-3 text-center min-w-[80px]">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider leading-tight">
                                            {page.name}
                                        </span>
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center min-w-[80px] sticky right-0 bg-white dark:bg-gray-900 z-10">
                                <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">จัดการ</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const isEditing = editingId === item.id;
                            const pages = isEditing ? editPages : item.allowed_pages;

                            return (
                                <tr
                                    key={item.id}
                                    className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${isEditing ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                                        }`}
                                >
                                    {/* Name + Code */}
                                    <td className="px-6 py-4 sticky left-0 bg-inherit z-10">
                                        {isEditing ? (
                                            <Input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="h-8 text-sm w-32"
                                            />
                                        ) : (
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-400">{item.code}</div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Page Permission Cells */}
                                    {availablePages.map(page => (
                                        <td key={page.key} className="px-2 py-4 text-center">
                                            {isEditing ? (
                                                <PermIcon
                                                    enabled={pages.includes(page.key)}
                                                    onClick={() => togglePage(page.key)}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    {pages.includes(page.key) ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    ))}

                                    {/* Actions */}
                                    <td className="px-4 py-4 sticky right-0 bg-inherit z-10">
                                        {isEditing ? (
                                            <div className="flex flex-col gap-1">
                                                <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                                                    <Check className="h-3 w-3 mr-1" /> บันทึก
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs">
                                                    ยกเลิก
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => startEdit(item)}
                                                    className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                {item.code !== 'super_admin' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(item.id, item.name)}
                                                        className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============== Users Tab ==============
function UsersTab({
    users, roles, departments, onRefresh
}: {
    users: UserItem[];
    roles: Role[];
    departments: Department[];
    onRefresh: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [editingRoles, setEditingRoles] = useState<string | null>(null);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role_id: '',
        department_id: '',
        employee_code: '',
    });
    const [creating, setCreating] = useState(false);

    const resetNewUser = () => setNewUser({
        email: '', username: '', full_name: '', password: '',
        role_id: '', department_id: '', employee_code: '',
    });

    const filteredUsers = users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.employee_code || '').toLowerCase().includes(q)
        );
    });

    const handleAssignRoles = async (userId: string) => {
        try {
            const roleName = roles.find(r => r.id === selectedRoleIds[0])?.code || '';
            await localDb.from('users').update({ role: roleName }).eq('id', userId);
            toast.success('กำหนดบทบาทสำเร็จ');
            setEditingRoles(null);
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleUpdateDepartment = async (userId: string, deptId: string) => {
        try {
            const deptName = departments.find(d => d.id === deptId)?.code || '';
            await localDb.from('users').update({ department: deptName, department_id: deptId || null }).eq('id', userId);
            toast.success('เปลี่ยนแผนกสำเร็จ');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleToggleActive = async (userId: string, currentActive: boolean) => {
        try {
            await localDb.from('users').update({ is_active: !currentActive }).eq('id', userId);
            toast.success(currentActive ? 'ปิดใช้งานบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleResetPassword = async (userId: string) => {
        try {
            await localDb.from('users').update({ password_hash: newPassword }).eq('id', userId);
            toast.success('รีเซ็ตรหัสผ่านสำเร็จ');
            setResetPasswordId(null);
            setNewPassword('');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.full_name || !newUser.password) {
            toast.error('กรุณากรอก อีเมล, ชื่อจริง, รหัสผ่าน');
            return;
        }
        if (newUser.password.length < 4) {
            toast.error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
            return;
        }
        try {
            setCreating(true);
            const roleCode = roles.find(r => r.id === newUser.role_id)?.code || '';
            const deptCode = departments.find(d => d.id === newUser.department_id)?.code || '';
            await localDb.from('users').insert({
                email: newUser.email,
                username: newUser.username || newUser.email,
                full_name: newUser.full_name,
                password_hash: newUser.password,
                role: roleCode,
                department: deptCode,
                department_id: newUser.department_id || null,
                employee_code: newUser.employee_code || null,
                is_active: true,
            });
            toast.success('เพิ่มผู้ใช้สำเร็จ');
            setShowCreate(false);
            resetNewUser();
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'ไม่สามารถเพิ่มผู้ใช้ได้');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (userId: string, name: string) => {
        if (!confirm(`ยืนยันลบผู้ใช้ "${name}"?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
        try {
            await localDb.from('users').delete().eq('id', userId);
            toast.success('ลบผู้ใช้สำเร็จ');
            onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'ไม่สามารถลบผู้ใช้ได้');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">รายชื่อผู้ใช้งาน</h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="ค้นหาผู้ใช้..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 w-64 text-sm"
                        />
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setShowCreate(s => !s)}
                        className="bg-green-600 hover:bg-green-700 text-white h-9"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        เพิ่มผู้ใช้
                    </Button>
                </div>
            </div>

            {/* Create User Form */}
            {showCreate && (
                <div className="px-6 py-4 bg-green-50/50 dark:bg-green-950/20 border-b border-green-100 dark:border-green-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Input
                            placeholder="อีเมล *"
                            type="email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder="ชื่อจริง *"
                            value={newUser.full_name}
                            onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder="Username (ว่าง = ใช้อีเมล)"
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder="รหัสผ่าน *"
                            type="password"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="h-9 text-sm"
                        />
                        <Input
                            placeholder="รหัสพนักงาน"
                            value={newUser.employee_code}
                            onChange={e => setNewUser({ ...newUser, employee_code: e.target.value })}
                            className="h-9 text-sm"
                        />
                        <select
                            value={newUser.role_id}
                            onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}
                            className="border rounded-md px-3 h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        >
                            <option value="">-- เลือกบทบาท --</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <select
                            value={newUser.department_id}
                            onChange={e => setNewUser({ ...newUser, department_id: e.target.value })}
                            className="border rounded-md px-3 h-9 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        >
                            <option value="">-- เลือกแผนก --</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={handleCreateUser}
                            disabled={creating || !newUser.email || !newUser.full_name || !newUser.password}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Save className="h-4 w-4 mr-1" />
                            {creating ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowCreate(false); resetNewUser(); }}
                            disabled={creating}
                        >
                            ยกเลิก
                        </Button>
                        <span className="text-xs text-gray-500 ml-auto">* ช่องที่ต้องกรอก</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">ผู้ใช้</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">บทบาท</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">แผนก</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">สถานะ</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">เข้าสู่ระบบล่าสุด</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <React.Fragment key={u.id}>
                                <tr
                                    className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${!u.is_active ? 'opacity-50' : ''
                                        } ${expandedUser === u.id ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}
                                    onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                >
                                    {/* User */}
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${u.is_active ? 'bg-blue-600' : 'bg-gray-400'
                                                }`}>
                                                {(u.full_name || u.username || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-gray-900 dark:text-white">{u.full_name || u.username}</div>
                                                <div className="text-xs text-gray-400">{u.username || u.email}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Roles */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles.length > 0 ? u.roles.map(r => (
                                                <Badge key={r.id} variant={r.code === 'super_admin' ? 'destructive' : 'secondary'} className="text-xs">
                                                    {r.name}
                                                </Badge>
                                            )) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Department */}
                                    <td className="px-4 py-3">
                                        {u.department ? (
                                            <Badge variant="outline" className="text-xs">{u.department.name}</Badge>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </div>
                                    </td>

                                    {/* Last Login */}
                                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                                        {u.last_login ? new Date(u.last_login).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                size="sm" variant="outline"
                                                onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                                                className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="sm" variant="outline"
                                                onClick={() => handleToggleActive(u.id, u.is_active)}
                                                className={`h-8 w-8 p-0 ${u.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}
                                            >
                                                {u.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                            </Button>
                                            {!u.roles.some(r => r.code === 'super_admin') && (
                                                <Button
                                                    size="sm" variant="outline"
                                                    onClick={() => handleDeleteUser(u.id, u.full_name || u.username || u.email)}
                                                    className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                                                    title="ลบผู้ใช้"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Row */}
                                {expandedUser === u.id && (
                                    <tr key={`${u.id}-expand`} className="bg-gray-50/80 dark:bg-gray-800/30">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="space-y-4 max-w-2xl">
                                                {/* Role Assignment */}
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">บทบาท</label>
                                                    {editingRoles === u.id ? (
                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            {roles.map(r => (
                                                                <label key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${selectedRoleIds.includes(r.id)
                                                                        ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/40 dark:border-blue-600'
                                                                        : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700'
                                                                    }`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedRoleIds.includes(r.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) setSelectedRoleIds([...selectedRoleIds, r.id]);
                                                                            else setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.id));
                                                                        }}
                                                                        className="rounded border-gray-300"
                                                                    />
                                                                    {r.name}
                                                                </label>
                                                            ))}
                                                            <Button size="sm" onClick={() => handleAssignRoles(u.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                                                <Save className="h-3 w-3 mr-1" /> บันทึก
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingRoles(null)}>ยกเลิก</Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                                {u.roles.length > 0 ? u.roles.map(r => r.name).join(', ') : 'ไม่มีบทบาท'}
                                                            </span>
                                                            <Button size="sm" variant="outline" onClick={() => { setEditingRoles(u.id); setSelectedRoleIds(u.roles.map(r => r.id)); }} className="h-7 text-xs">
                                                                <Pencil className="h-3 w-3 mr-1" /> แก้ไข
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Department */}
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">แผนก</label>
                                                    <select
                                                        value={u.department?.id || ''}
                                                        onChange={(e) => handleUpdateDepartment(u.id, e.target.value)}
                                                        className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                                    >
                                                        <option value="">-- ไม่ระบุ --</option>
                                                        {departments.map(d => (
                                                            <option key={d.id} value={d.id}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Password Reset */}
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">รหัสผ่าน</label>
                                                    {resetPasswordId === u.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative">
                                                                <Input
                                                                    type={showPassword ? 'text' : 'password'}
                                                                    placeholder="รหัสผ่านใหม่"
                                                                    value={newPassword}
                                                                    onChange={e => setNewPassword(e.target.value)}
                                                                    className="pr-8 h-8 text-sm w-48"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                                                >
                                                                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                </button>
                                                            </div>
                                                            <Button size="sm" onClick={() => handleResetPassword(u.id)} disabled={newPassword.length < 4} className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs">
                                                                บันทึก
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => { setResetPasswordId(null); setNewPassword(''); }} className="h-8 text-xs">
                                                                ยกเลิก
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => setResetPasswordId(u.id)} className="h-7 text-xs">
                                                            <Key className="h-3 w-3 mr-1" /> รีเซ็ตรหัสผ่าน
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
