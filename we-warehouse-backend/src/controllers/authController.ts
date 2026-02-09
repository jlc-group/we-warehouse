/**
 * Authentication Controller
 * JWT login, token verification, user info
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getLocalPool } from '../config/localDatabase.js';

// ============== Configuration ==============
const JWT_SECRET = process.env.JWT_SECRET || 'we-warehouse-secret-key-change-in-production';
const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;

// ============== Types ==============
export interface JwtPayload {
    sub: string;       // user ID
    username: string;
    allowed_pages: string[];
    iat?: number;
    exp?: number;
}

export interface AuthUser {
    id: string;
    username: string;
    email: string;
    full_name: string;
    is_active: boolean;
    roles: { id: string; code: string; name: string }[];
    department: { id: string; code: string; name: string } | null;
    allowed_pages: string[];
}

// ============== Helper Functions ==============

/**
 * Get all allowed pages for a user from their roles + department (union)
 */
async function getUserAllowedPages(userId: string): Promise<string[]> {
    const pool = getLocalPool();
    const pages = new Set<string>();

    // Pages from roles
    const rolesResult = await pool.query(`
        SELECT r.allowed_pages
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
    `, [userId]);

    for (const row of rolesResult.rows) {
        if (row.allowed_pages) {
            try {
                const rolePages: string[] = JSON.parse(row.allowed_pages);
                rolePages.forEach(p => pages.add(p));
            } catch { /* ignore parse errors */ }
        }
    }

    // Pages from department
    const deptResult = await pool.query(`
        SELECT d.allowed_pages
        FROM users u
        JOIN departments d ON d.id = u.department_id
        WHERE u.id = $1
    `, [userId]);

    for (const row of deptResult.rows) {
        if (row.allowed_pages) {
            try {
                const deptPages: string[] = JSON.parse(row.allowed_pages);
                deptPages.forEach(p => pages.add(p));
            } catch { /* ignore parse errors */ }
        }
    }

    return Array.from(pages);
}

/**
 * Get user roles
 */
async function getUserRoles(userId: string): Promise<{ id: string; code: string; name: string }[]> {
    const pool = getLocalPool();
    const result = await pool.query(`
        SELECT r.id, r.code, r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
    `, [userId]);
    return result.rows;
}

/**
 * Get user department
 */
async function getUserDepartment(userId: string): Promise<{ id: string; code: string; name: string } | null> {
    const pool = getLocalPool();
    const result = await pool.query(`
        SELECT d.id, d.code, d.name
        FROM users u
        JOIN departments d ON d.id = u.department_id
        WHERE u.id = $1
    `, [userId]);
    return result.rows[0] || null;
}

/**
 * Check if user has super_admin role
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
    const roles = await getUserRoles(userId);
    return roles.some(r => r.code === 'super_admin');
}

/**
 * Create JWT access token
 */
function createAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: JWT_ALGORITHM as jwt.Algorithm,
        expiresIn: `${ACCESS_TOKEN_EXPIRE_HOURS}h`,
    });
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Build full user info response
 */
async function buildUserInfo(user: any): Promise<AuthUser> {
    const roles = await getUserRoles(user.id);
    const department = await getUserDepartment(user.id);
    const allowedPages = await getUserAllowedPages(user.id);

    return {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        full_name: user.full_name,
        is_active: user.is_active,
        roles,
        department,
        allowed_pages: allowedPages,
    };
}

// ============== Auth Controller ==============

export class AuthController {
    /**
     * POST /api/auth/login
     * Login with username/email + password
     */
    static async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้หรืออีเมล' });
            }

            const pool = getLocalPool();

            // Find user by username or email
            const isEmail = username.includes('@');
            const userResult = await pool.query(
                `SELECT * FROM users WHERE ${isEmail ? 'email' : 'username'} = $1 AND is_active = true`,
                [username]
            );

            if (userResult.rows.length === 0) {
                // Also try the other field
                const altResult = await pool.query(
                    `SELECT * FROM users WHERE ${isEmail ? 'username' : 'email'} = $1 AND is_active = true`,
                    [username]
                );
                if (altResult.rows.length === 0) {
                    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
                }
                userResult.rows = altResult.rows;
            }

            const user = userResult.rows[0];

            // Verify password
            if (user.password_hash) {
                const isValid = await bcrypt.compare(password || '', user.password_hash);
                if (!isValid) {
                    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
                }
            } else {
                // User has no password - allow login with username as password or empty (initial setup)
                if (password && password !== '' && password !== username && password !== user.username) {
                    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
                }
            }

            if (!user.is_active) {
                return res.status(403).json({ error: 'บัญชีถูกปิดใช้งาน' });
            }

            // Build user info
            const userInfo = await buildUserInfo(user);

            // Create JWT token
            const token = createAccessToken({
                sub: user.id,
                username: user.username || user.email,
                allowed_pages: userInfo.allowed_pages,
            });

            // Update last_login
            try {
                await pool.query(
                    'UPDATE users SET last_login = NOW() WHERE id = $1',
                    [user.id]
                );
            } catch { /* ignore */ }

            res.json({
                access_token: token,
                token_type: 'bearer',
                user: userInfo,
            });
        } catch (error: any) {
            console.error('❌ Login error:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
        }
    }

    /**
     * GET /api/auth/me
     * Get current user info (requires auth)
     */
    static async getMe(req: Request, res: Response) {
        try {
            const authUser = (req as any).user;
            if (!authUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const pool = getLocalPool();
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [authUser.sub]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const userInfo = await buildUserInfo(result.rows[0]);
            res.json(userInfo);
        } catch (error: any) {
            console.error('❌ Get me error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/auth/change-password
     * Change password for current user
     */
    static async changePassword(req: Request, res: Response) {
        try {
            const authUser = (req as any).user;
            if (!authUser) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { current_password, new_password } = req.body;
            if (!new_password || new_password.length < 4) {
                return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
            }

            const pool = getLocalPool();
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [authUser.sub]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            // Verify current password if set
            if (user.password_hash) {
                const isValid = await bcrypt.compare(current_password || '', user.password_hash);
                if (!isValid) {
                    return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
                }
            }

            // Hash and update
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(new_password, saltRounds);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, authUser.sub]);

            res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        } catch (error: any) {
            console.error('❌ Change password error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

// ============== Middleware Functions ==============

/**
 * Middleware: Extract user from JWT token
 * Does NOT block - just attaches user to request if token is valid
 */
export function extractUser(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload) {
            (req as any).user = payload;
        }
    }
    next();
}

/**
 * Middleware: Require authenticated user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authUser = (req as any).user;
    if (!authUser) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

/**
 * Middleware factory: Require specific role(s)
 * Super admin bypasses all role checks
 */
export function requireRole(...roleCodes: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authUser = (req as any).user;
            if (!authUser) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Check if super admin
            if (await isSuperAdmin(authUser.sub)) {
                return next();
            }

            // Check if user has any of the required roles
            const userRoles = await getUserRoles(authUser.sub);
            const userRoleCodes = userRoles.map(r => r.code);
            const hasRequired = roleCodes.some(rc => userRoleCodes.includes(rc));

            if (!hasRequired) {
                return res.status(403).json({
                    error: `ต้องมีสิทธิ์: ${roleCodes.join(', ')}`,
                });
            }

            next();
        } catch (error: any) {
            console.error('❌ Role check error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

/**
 * Middleware factory: Require access to specific page
 * Super admin bypasses all page checks
 */
export function requirePage(pageKey: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authUser = (req as any).user;
            if (!authUser) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Check if super admin
            if (await isSuperAdmin(authUser.sub)) {
                return next();
            }

            // Check allowed pages from token
            if (authUser.allowed_pages && authUser.allowed_pages.includes(pageKey)) {
                return next();
            }

            // Fallback: check from DB
            const pages = await getUserAllowedPages(authUser.sub);
            if (pages.includes(pageKey)) {
                return next();
            }

            return res.status(403).json({
                error: `ไม่มีสิทธิ์เข้าถึงหน้า '${pageKey}'. กรุณาติดต่อผู้ดูแลระบบ`,
            });
        } catch (error: any) {
            console.error('❌ Page check error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

// ============== Available Pages ==============
export const AVAILABLE_PAGES = [
    { key: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard' },
    { key: 'inventory', name: 'สินค้าในคลัง', icon: 'Package' },
    { key: 'locations', name: 'จัดการตำแหน่ง', icon: 'MapPin' },
    { key: 'orders', name: 'ออเดอร์', icon: 'ShoppingCart' },
    { key: 'picking', name: 'หยิบสินค้า', icon: 'PackageSearch' },
    { key: 'packing', name: 'แพคสินค้า', icon: 'Box' },
    { key: 'shipping', name: 'จัดส่ง', icon: 'Truck' },
    { key: 'assignment', name: 'กระจายงาน', icon: 'Users' },
    { key: 'finance', name: 'การเงิน', icon: 'DollarSign' },
    { key: 'accounting', name: 'บัญชี', icon: 'Calculator' },
    { key: 'products', name: 'จัดการสินค้า', icon: 'Boxes' },
    { key: 'transfers', name: 'โอนย้ายสินค้า', icon: 'ArrowLeftRight' },
    { key: 'reports', name: 'รายงาน', icon: 'FileBarChart' },
    { key: 'admin', name: 'จัดการระบบ', icon: 'Shield' },
];
