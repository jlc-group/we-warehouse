/**
 * JLC SSO Routes — OAuth 2.0 Authorization Code flow
 *
 * /api/auth/sso/login    → redirect to sso.jlcgroup.co/oauth/authorize
 * /api/auth/sso/callback → exchange code → fetch userinfo → upsert user → JWT → redirect frontend
 *
 * Required env vars:
 *   SSO_BASE_URL, SSO_CLIENT_ID, SSO_CLIENT_SECRET,
 *   SSO_REDIRECT_URI, SSO_FRONTEND_URL, JWT_SECRET
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getLocalPool } from '../config/localDatabase.js';

const router = Router();

const SSO_BASE_URL = process.env.SSO_BASE_URL || 'https://sso.jlcgroup.co';
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';
const SSO_REDIRECT_URI = process.env.SSO_REDIRECT_URI || 'https://warehouse-api.wejlc.com/api/auth/sso/callback';
const SSO_FRONTEND_URL = process.env.SSO_FRONTEND_URL || 'https://warehouse.wejlc.com';
const JWT_SECRET = process.env.JWT_SECRET || 'we-warehouse-secret-key-change-in-production';
const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_HOURS = 24;

// CSRF state store (10-min expiry)
const stateStore = new Map<string, number>();
setInterval(() => {
    const now = Date.now();
    for (const [s, exp] of stateStore) if (exp < now) stateStore.delete(s);
}, 5 * 60 * 1000).unref?.();

// ── Helpers ──

async function getUserAllowedPages(userId: string): Promise<string[]> {
    const pool = getLocalPool();
    const pages = new Set<string>();
    try {
        const rolesResult = await pool.query(`
            SELECT r.allowed_pages
            FROM user_roles ur JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1
        `, [userId]);
        for (const row of rolesResult.rows) {
            if (row.allowed_pages) {
                try { (JSON.parse(row.allowed_pages) as string[]).forEach(p => pages.add(p)); } catch {}
            }
        }
        const deptResult = await pool.query(`
            SELECT d.allowed_pages FROM users u JOIN departments d ON d.id = u.department_id WHERE u.id = $1
        `, [userId]);
        for (const row of deptResult.rows) {
            if (row.allowed_pages) {
                try { (JSON.parse(row.allowed_pages) as string[]).forEach(p => pages.add(p)); } catch {}
            }
        }
    } catch {
        // table may not exist; return empty
    }
    return Array.from(pages);
}

async function buildUserInfo(user: any) {
    const pool = getLocalPool();
    let roles: any[] = [];
    let department: any = null;
    try {
        const rolesResult = await pool.query(`
            SELECT r.id, r.code, r.name FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1
        `, [user.id]);
        roles = rolesResult.rows;
    } catch {}
    try {
        const deptResult = await pool.query(`
            SELECT d.id, d.code, d.name FROM users u
            JOIN departments d ON d.id = u.department_id WHERE u.id = $1
        `, [user.id]);
        department = deptResult.rows[0] || null;
    } catch {}
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

function createAccessToken(payload: { sub: string; username: string; allowed_pages: string[] }): string {
    return jwt.sign(payload, JWT_SECRET, {
        algorithm: JWT_ALGORITHM as jwt.Algorithm,
        expiresIn: `${ACCESS_TOKEN_EXPIRE_HOURS}h`,
    });
}

// ── Routes ──

/**
 * GET /api/auth/sso/login → redirect to SSO
 */
router.get('/login', (_req: Request, res: Response) => {
    if (!SSO_CLIENT_ID) {
        return res.status(500).json({
            error: 'SSO not configured',
            hint: 'Set SSO_CLIENT_ID and SSO_CLIENT_SECRET in .env',
        });
    }
    const state = crypto.randomBytes(16).toString('hex');
    stateStore.set(state, Date.now() + 10 * 60 * 1000);

    const params = new URLSearchParams({
        client_id: SSO_CLIENT_ID,
        redirect_uri: SSO_REDIRECT_URI,
        response_type: 'code',
        state,
    });
    const authorizeUrl = `${SSO_BASE_URL}/oauth/authorize?${params.toString()}`;
    console.log('🔐 SSO redirect:', authorizeUrl);
    res.redirect(authorizeUrl);
});

/**
 * GET /api/auth/sso/callback?code=xxx&state=xxx
 */
router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error: ssoError, error_description } = req.query as Record<string, string>;

    if (ssoError) {
        console.error('❌ SSO error:', ssoError, error_description);
        return res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=${encodeURIComponent(error_description || ssoError)}`);
    }
    if (!code) return res.status(400).json({ error: 'Missing code' });
    if (!state || !stateStore.has(state)) {
        return res.status(400).json({ error: 'Invalid or expired state' });
    }
    stateStore.delete(state);

    try {
        // 1. Exchange code → token
        const tokenRes = await fetch(`${SSO_BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: SSO_CLIENT_ID,
                client_secret: SSO_CLIENT_SECRET,
                code,
                redirect_uri: SSO_REDIRECT_URI,
            }),
        });
        if (!tokenRes.ok) {
            console.error('❌ Token exchange failed:', tokenRes.status);
            return res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=token_exchange_failed`);
        }
        const tokenData: any = await tokenRes.json();
        const accessToken = tokenData.access_token || tokenData.data?.access_token;
        if (!accessToken) {
            return res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=no_access_token`);
        }

        // 2. Fetch userinfo
        const userRes = await fetch(`${SSO_BASE_URL}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userRes.ok) {
            return res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=userinfo_failed`);
        }
        const userInfo: any = await userRes.json();
        const ssoUser = userInfo.data || userInfo;
        const ssoId: string = ssoUser.id || ssoUser.sub || ssoUser.user_id;
        const ssoEmail: string = ssoUser.email || '';
        const ssoName: string = ssoUser.name || ssoUser.full_name || ssoUser.display_name || ssoEmail;
        const ssoUsername: string = ssoUser.username || (ssoEmail ? ssoEmail.split('@')[0] : `sso-${ssoId}`);

        if (!ssoId) {
            return res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=invalid_user`);
        }

        // 3. Upsert user — match by sso_id, email, or username
        const pool = getLocalPool();
        const existing = await pool.query(`
            SELECT * FROM users
            WHERE (sso_provider = 'jlc' AND sso_id = $1)
               OR (email = $2 AND $2 != '')
               OR username = $3
            LIMIT 1
        `, [ssoId, ssoEmail, ssoUsername]);

        let dbUser;
        if (existing.rows.length > 0) {
            const u = existing.rows[0];
            const upd = await pool.query(`
                UPDATE users
                SET sso_provider = 'jlc',
                    sso_id = $1,
                    email = COALESCE(NULLIF($2, ''), email),
                    full_name = COALESCE(NULLIF($3, ''), full_name),
                    last_login = NOW()::text,
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            `, [ssoId, ssoEmail, ssoName, u.id]);
            dbUser = upd.rows[0];
            console.log(`✅ SSO login: existing user ${dbUser.username || dbUser.email}`);
        } else {
            const ins = await pool.query(`
                INSERT INTO users (
                    email, username, full_name, role, role_level,
                    is_active, sso_provider, sso_id, password_hash
                )
                VALUES ($1, $2, $3, 'staff', 1, true, 'jlc', $4, '__sso_only__')
                RETURNING *
            `, [ssoEmail, ssoUsername, ssoName, ssoId]);
            dbUser = ins.rows[0];
            console.log(`✅ SSO login: new staff user ${dbUser.username || dbUser.email}`);
        }

        // 4. Build full user info + JWT
        const fullUserInfo = await buildUserInfo(dbUser);
        const token = createAccessToken({
            sub: dbUser.id,
            username: dbUser.username || dbUser.email,
            allowed_pages: fullUserInfo.allowed_pages,
        });

        // 5. Redirect frontend with token + user in hash
        const params = new URLSearchParams({
            token,
            userId: dbUser.id,
            username: dbUser.username || dbUser.email || '',
            email: dbUser.email || '',
            fullName: dbUser.full_name || '',
            role: dbUser.role || 'staff',
            department: fullUserInfo.department?.name || dbUser.department || '',
            allowedPages: JSON.stringify(fullUserInfo.allowed_pages),
        });
        res.redirect(`${SSO_FRONTEND_URL}/auth/sso/callback#${params.toString()}`);
    } catch (err: any) {
        console.error('❌ SSO callback error:', err);
        res.redirect(`${SSO_FRONTEND_URL}/auth?sso_error=${encodeURIComponent(err.message)}`);
    }
});

export default router;
