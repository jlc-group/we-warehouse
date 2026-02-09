/**
 * Users, Roles, and Departments Management Controller
 * CRUD operations for the permission system
 */
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { getLocalPool } from '../config/localDatabase.js';

export class PermissionController {
    // ============== Users ==============

    /**
     * GET /api/admin/users
     * List all users with roles and department
     */
    static async listUsers(req: Request, res: Response) {
        try {
            const pool = getLocalPool();
            const result = await pool.query(`
                SELECT u.id, u.username, u.email, u.full_name, u.is_active,
                       u.department, u.role, u.role_level, u.employee_code,
                       u.department_id, u.last_login,
                       d.code as dept_code, d.name as dept_name
                FROM users u
                LEFT JOIN departments d ON d.id = u.department_id
                ORDER BY u.full_name
            `);

            // Get roles for each user
            const usersWithRoles = await Promise.all(result.rows.map(async (user) => {
                const rolesResult = await pool.query(`
                    SELECT r.id, r.code, r.name
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = $1
                `, [user.id]);

                const department = user.department_id ? {
                    id: user.department_id,
                    code: user.dept_code,
                    name: user.dept_name,
                } : null;

                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    is_active: user.is_active,
                    employee_code: user.employee_code,
                    last_login: user.last_login,
                    roles: rolesResult.rows,
                    department,
                    // Legacy fields
                    legacy_role: user.role,
                    legacy_role_level: user.role_level,
                    legacy_department: user.department,
                };
            }));

            res.json(usersWithRoles);
        } catch (error: any) {
            console.error('❌ List users error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/admin/users
     * Create a new user
     */
    static async createUser(req: Request, res: Response) {
        try {
            const { username, email, full_name, password, role_ids, department_id, is_active } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'Username is required' });
            }

            const pool = getLocalPool();

            // Check if username exists
            const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash password
            let passwordHash = null;
            if (password) {
                passwordHash = await bcrypt.hash(password, 10);
            }

            // Create user
            const userResult = await pool.query(`
                INSERT INTO users (username, email, full_name, password_hash, is_active, department_id, role, role_level, department)
                VALUES ($1, $2, $3, $4, $5, $6, 'พนักงาน', 2, 'ทั่วไป')
                RETURNING id
            `, [username, email, full_name, passwordHash, is_active !== false, department_id || null]);

            const userId = userResult.rows[0].id;

            // Assign roles
            if (role_ids && Array.isArray(role_ids)) {
                for (const roleId of role_ids) {
                    await pool.query(
                        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [userId, roleId]
                    );
                }
            }

            res.json({ id: userId, username, message: 'User created' });
        } catch (error: any) {
            console.error('❌ Create user error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/admin/users/:id
     * Update a user
     */
    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { email, full_name, is_active, department_id } = req.body;

            const pool = getLocalPool();
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIdx = 1;

            if (email !== undefined) { setClauses.push(`email = $${paramIdx++}`); values.push(email); }
            if (full_name !== undefined) { setClauses.push(`full_name = $${paramIdx++}`); values.push(full_name); }
            if (is_active !== undefined) { setClauses.push(`is_active = $${paramIdx++}`); values.push(is_active); }
            if (department_id !== undefined) { setClauses.push(`department_id = $${paramIdx++}`); values.push(department_id || null); }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            await pool.query(
                `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
                values
            );

            res.json({ id, message: 'User updated' });
        } catch (error: any) {
            console.error('❌ Update user error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/admin/users/:id
     * Delete a user
     */
    static async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const pool = getLocalPool();

            await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
            await pool.query('DELETE FROM users WHERE id = $1', [id]);

            res.json({ message: 'User deleted' });
        } catch (error: any) {
            console.error('❌ Delete user error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/admin/users/:id/roles
     * Assign roles to a user (replaces existing)
     */
    static async assignRoles(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { role_ids } = req.body;

            if (!Array.isArray(role_ids)) {
                return res.status(400).json({ error: 'role_ids must be an array' });
            }

            const pool = getLocalPool();

            // Remove existing roles
            await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

            // Add new roles
            for (const roleId of role_ids) {
                await pool.query(
                    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, roleId]
                );
            }

            res.json({ message: 'Roles assigned' });
        } catch (error: any) {
            console.error('❌ Assign roles error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/admin/users/:id/reset-password
     * Reset password for a user (admin only)
     */
    static async resetPassword(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { new_password } = req.body;

            if (!new_password || new_password.length < 4) {
                return res.status(400).json({ error: 'Password must be at least 4 characters' });
            }

            const pool = getLocalPool();
            const hashedPassword = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);

            res.json({ message: 'Password reset successfully' });
        } catch (error: any) {
            console.error('❌ Reset password error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ============== Roles ==============

    /**
     * GET /api/admin/roles
     * List all roles
     */
    static async listRoles(req: Request, res: Response) {
        try {
            const pool = getLocalPool();
            const result = await pool.query('SELECT * FROM roles ORDER BY name');

            const roles = result.rows.map(role => {
                let allowedPages: string[] = [];
                if (role.allowed_pages) {
                    try { allowedPages = JSON.parse(role.allowed_pages); } catch { }
                }
                return {
                    id: role.id,
                    code: role.code,
                    name: role.name,
                    allowed_pages: allowedPages,
                };
            });

            res.json(roles);
        } catch (error: any) {
            console.error('❌ List roles error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/admin/roles
     * Create a new role
     */
    static async createRole(req: Request, res: Response) {
        try {
            const { code, name, allowed_pages } = req.body;

            if (!code || !name) {
                return res.status(400).json({ error: 'code and name are required' });
            }

            const pool = getLocalPool();
            const existing = await pool.query('SELECT id FROM roles WHERE code = $1', [code]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Role code already exists' });
            }

            const result = await pool.query(
                'INSERT INTO roles (code, name, allowed_pages) VALUES ($1, $2, $3) RETURNING id',
                [code, name, JSON.stringify(allowed_pages || [])]
            );

            res.json({ id: result.rows[0].id, code, message: 'Role created' });
        } catch (error: any) {
            console.error('❌ Create role error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/admin/roles/:id
     * Update a role
     */
    static async updateRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, allowed_pages } = req.body;

            const pool = getLocalPool();
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIdx = 1;

            if (name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(name); }
            if (allowed_pages !== undefined) { setClauses.push(`allowed_pages = $${paramIdx++}`); values.push(JSON.stringify(allowed_pages)); }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            await pool.query(
                `UPDATE roles SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
                values
            );

            res.json({ id, message: 'Role updated' });
        } catch (error: any) {
            console.error('❌ Update role error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/admin/roles/:id
     * Delete a role
     */
    static async deleteRole(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const pool = getLocalPool();

            await pool.query('DELETE FROM user_roles WHERE role_id = $1', [id]);
            await pool.query('DELETE FROM roles WHERE id = $1', [id]);

            res.json({ message: 'Role deleted' });
        } catch (error: any) {
            console.error('❌ Delete role error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ============== Departments ==============

    /**
     * GET /api/admin/departments
     * List all departments
     */
    static async listDepartments(req: Request, res: Response) {
        try {
            const pool = getLocalPool();
            const result = await pool.query('SELECT * FROM departments ORDER BY name');

            const departments = result.rows.map(dept => {
                let allowedPages: string[] = [];
                if (dept.allowed_pages) {
                    try { allowedPages = JSON.parse(dept.allowed_pages); } catch { }
                }
                return {
                    id: dept.id,
                    code: dept.code,
                    name: dept.name,
                    allowed_pages: allowedPages,
                };
            });

            res.json(departments);
        } catch (error: any) {
            console.error('❌ List departments error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/admin/departments
     * Create a new department
     */
    static async createDepartment(req: Request, res: Response) {
        try {
            const { code, name, allowed_pages } = req.body;

            if (!code || !name) {
                return res.status(400).json({ error: 'code and name are required' });
            }

            const pool = getLocalPool();
            const existing = await pool.query('SELECT id FROM departments WHERE code = $1', [code]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Department code already exists' });
            }

            const result = await pool.query(
                'INSERT INTO departments (code, name, allowed_pages) VALUES ($1, $2, $3) RETURNING id',
                [code, name, JSON.stringify(allowed_pages || [])]
            );

            res.json({ id: result.rows[0].id, code, message: 'Department created' });
        } catch (error: any) {
            console.error('❌ Create department error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PUT /api/admin/departments/:id
     * Update a department
     */
    static async updateDepartment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, allowed_pages } = req.body;

            const pool = getLocalPool();
            const setClauses: string[] = [];
            const values: any[] = [];
            let paramIdx = 1;

            if (name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(name); }
            if (allowed_pages !== undefined) { setClauses.push(`allowed_pages = $${paramIdx++}`); values.push(JSON.stringify(allowed_pages)); }

            if (setClauses.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(id);
            await pool.query(
                `UPDATE departments SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
                values
            );

            res.json({ id, message: 'Department updated' });
        } catch (error: any) {
            console.error('❌ Update department error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/admin/departments/:id
     * Delete a department
     */
    static async deleteDepartment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const pool = getLocalPool();

            // Clear department from users
            await pool.query('UPDATE users SET department_id = NULL WHERE department_id = $1', [id]);
            await pool.query('DELETE FROM departments WHERE id = $1', [id]);

            res.json({ message: 'Department deleted' });
        } catch (error: any) {
            console.error('❌ Delete department error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
