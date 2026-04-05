/**
 * Local PostgreSQL Client - Browser Compatible
 * Uses HTTP API backend instead of direct pg connection
 * 
 * NOTE: This requires we-warehouse-backend to be running on port 3004
 * Uses /api/local routes for generic PostgreSQL access
 * 
 * For Cloudflare Tunnel: Set VITE_BACKEND_URL in .env
 */

// Backend API URL - use env variable for Tunnel or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3004/api/local';

// Raw SQL expression marker - used in .update() payloads for SQL expressions like GREATEST()
export class RawExpression {
    constructor(public readonly expression: string) {}
    toJSON() { return { __raw: this.expression }; }
}

// No-op channel for Supabase real-time subscription compatibility
class NoOpChannel {
    on(_event: string, _opts: any, _callback?: any) { return this; }
    subscribe(_callback?: any) { return this; }
    unsubscribe() { return this; }
}

// Supabase-compatible query interface using HTTP API
export class LocalDatabaseClient {
    private baseUrl: string;

    constructor(baseUrl: string = BACKEND_URL) {
        this.baseUrl = baseUrl;
    }

    from(tableName: string) {
        return new QueryBuilder(this.baseUrl, tableName);
    }

    /**
     * Create a raw SQL expression marker for use in .update() calls
     * Backend will interpret { __raw: "SQL" } as a raw SQL expression
     */
    raw(expression: string): RawExpression {
        return new RawExpression(expression);
    }

    /**
     * No-op channel for Supabase real-time subscription compatibility
     * Local PostgreSQL does not support real-time, so this returns a stub
     */
    channel(_name: string): NoOpChannel {
        return new NoOpChannel();
    }

    /**
     * No-op removeChannel for Supabase compatibility
     */
    removeChannel(_channel: any) {
        // No-op: local PostgreSQL has no real-time channels
    }

    /**
     * Call a stored function (RPC) via backend API
     * Mimics supabase.rpc() functionality
     */
    async rpc(functionName: string, params?: Record<string, any>): Promise<{ data: any; error: any }> {
        try {
            const response = await fetch(`${this.baseUrl}/rpc/${functionName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params || {})
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`RPC ${functionName} failed:`, error);
                return { data: null, error: { message: error.message || error.error || 'RPC call failed' } };
            }

            const data = await response.json();
            return { data, error: null };
        } catch (error: any) {
            console.error(`RPC ${functionName} error:`, error);
            return { data: null, error: { message: error.message } };
        }
    }

    /**
     * Execute raw SQL query via backend API
     */
    async query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql, params })
            });

            if (!response.ok) {
                throw new Error(`Query failed: ${response.statusText}`);
            }

            const data = await response.json();
            return { rows: data.rows || [], rowCount: data.rowCount || 0 };
        } catch (error) {
            console.error('Query error:', error);
            // Return empty result instead of throwing to prevent app crash
            return { rows: [], rowCount: 0 };
        }
    }
}

class QueryBuilder {
    private baseUrl: string;
    private tableName: string;
    private selectColumns: string = '*';
    private whereConditions: { column: string; value: any; operator: string }[] = [];
    private orConditions: string[] = [];
    private orderColumn: string = '';
    private orderDirection: string = 'ASC';
    private limitValue: number | null = null;
    private offsetValue: number | null = null;
    private singleResult: boolean = false;
    private maybeSingleMode: boolean = false;
    private pendingUpdate: any = null;
    private pendingDelete: boolean = false;
    private pendingUpsert: { data: any; onConflict?: string } | null = null;

    constructor(baseUrl: string, tableName: string) {
        this.baseUrl = baseUrl;
        this.tableName = tableName;
    }

    select(columns: string = '*') {
        this.selectColumns = columns;
        return this;
    }

    eq(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'eq' });
        return this;
    }

    neq(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'neq' });
        return this;
    }

    gt(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'gt' });
        return this;
    }

    lt(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'lt' });
        return this;
    }

    gte(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'gte' });
        return this;
    }

    lte(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'lte' });
        return this;
    }

    ilike(column: string, value: any) {
        this.whereConditions.push({ column, value, operator: 'ilike' });
        return this;
    }

    // .or() - Supabase-style OR filter: "col1.eq.val1,col2.eq.val2"
    or(filterString: string) {
        this.orConditions.push(filterString);
        return this;
    }

    // .in() - Filter where column value is in a list
    in(column: string, values: any[]) {
        this.whereConditions.push({ column, value: `(${values.join(',')})`, operator: 'in' });
        return this;
    }

    // .not() - Negate a filter: not('col', 'is', null) or not('col', 'in', '(a,b)')
    not(column: string, operator: string, value: any) {
        this.whereConditions.push({ column, value, operator: `not.${operator}` });
        return this;
    }

    // .is() - IS NULL / IS NOT NULL filter
    is(column: string, value: any) {
        this.whereConditions.push({ column, value: value === null ? 'null' : String(value), operator: 'is' });
        return this;
    }

    // .contains() - JSONB contains filter
    contains(column: string, value: any) {
        this.whereConditions.push({ column, value: JSON.stringify(value), operator: 'cs' });
        return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
        this.orderColumn = column;
        this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
        return this;
    }

    limit(count: number) {
        this.limitValue = count;
        return this;
    }

    // .range() - Pagination: range(0, 9) returns first 10 records
    range(from: number, to: number) {
        this.offsetValue = from;
        this.limitValue = to - from + 1;
        return this;
    }

    single() {
        this.singleResult = true;
        this.maybeSingleMode = false;
        this.limitValue = 1;
        return this;
    }

    // .maybeSingle() - Like single() but returns null instead of error if no rows
    maybeSingle() {
        this.singleResult = true;
        this.maybeSingleMode = true;
        this.limitValue = 1;
        return this;
    }

    // Deferred update - stores data and allows chaining with .eq()
    update(data: any) {
        this.pendingUpdate = data;
        return this;
    }

    // Deferred delete - allows chaining with .eq()
    delete() {
        this.pendingDelete = true;
        return this;
    }

    private buildQueryParams(): string {
        const params = new URLSearchParams();

        if (this.selectColumns !== '*') {
            params.set('select', this.selectColumns);
        }

        this.whereConditions.forEach(cond => {
            params.set(`${cond.column}`, `${cond.operator}.${cond.value}`);
        });

        // Add OR conditions
        this.orConditions.forEach(orStr => {
            params.append('or', orStr);
        });

        if (this.orderColumn) {
            params.set('order', `${this.orderColumn}.${this.orderDirection}`);
        }

        if (this.limitValue !== null) {
            params.set('limit', this.limitValue.toString());
        }

        if (this.offsetValue !== null) {
            params.set('offset', this.offsetValue.toString());
        }

        return params.toString();
    }

    async insert(data: any | any[]) {
        try {
            const response = await fetch(`${this.baseUrl}/${this.tableName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                return { data: null, error: { message: error.message || 'Insert failed' } };
            }

            const result = await response.json();
            return { data: result.data || result, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }

    // .upsert() - Insert or update on conflict
    upsert(data: any | any[], options?: { onConflict?: string }) {
        this.pendingUpsert = { data, onConflict: options?.onConflict };
        return this;
    }

    private async executeUpsert() {
        try {
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Upsert': 'true',
                    ...(this.pendingUpsert?.onConflict ? { 'X-On-Conflict': this.pendingUpsert.onConflict } : {})
                },
                body: JSON.stringify(this.pendingUpsert?.data)
            });

            if (!response.ok) {
                const error = await response.json();
                return { data: null, error: { message: error.message || 'Upsert failed' } };
            }

            const result = await response.json();
            const data = this.singleResult ? (Array.isArray(result) ? result[0] : result) : result;
            return { data: data || null, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }

    private async executeUpdate() {
        try {
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.pendingUpdate)
            });

            if (!response.ok) {
                const error = await response.json();
                return { data: null, error: { message: error.message || 'Update failed' } };
            }

            const result = await response.json();
            const data = this.singleResult ? (Array.isArray(result) ? result[0] : result) : result;
            return { data: data || null, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }

    private async executeDelete() {
        try {
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                return { data: null, error: { message: error.message || 'Delete failed' } };
            }

            const result = await response.json();
            return { data: result.data || result, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }

    async then(resolve: (value: { data: any; error: any }) => void) {
        try {
            // Handle pending upsert
            if (this.pendingUpsert !== null) {
                const result = await this.executeUpsert();
                resolve(result);
                return;
            }

            // Handle pending update
            if (this.pendingUpdate !== null) {
                const result = await this.executeUpdate();
                resolve(result);
                return;
            }

            // Handle pending delete
            if (this.pendingDelete) {
                const result = await this.executeDelete();
                resolve(result);
                return;
            }

            // Normal SELECT query
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                resolve({ data: null, error: { message: error.message || 'Query failed' } });
                return;
            }

            const result = await response.json();
            if (this.singleResult) {
                const row = Array.isArray(result) ? result[0] : result;
                if (!row && !this.maybeSingleMode) {
                    resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
                } else {
                    resolve({ data: row || null, error: null });
                }
            } else {
                resolve({ data: result, error: null });
            }
        } catch (error: any) {
            resolve({ data: null, error: { message: error.message } });
        }
    }
}

export const localDb = new LocalDatabaseClient(BACKEND_URL);

