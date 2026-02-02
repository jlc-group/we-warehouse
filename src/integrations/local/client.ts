/**
 * Local PostgreSQL Client - Browser Compatible
 * Uses HTTP API backend instead of direct pg connection
 * 
 * NOTE: This requires we-warehouse-backend to be running on port 3004
 * Uses /api/local routes for generic PostgreSQL access
 */

// Backend API URL - use /api/local for PostgreSQL data
const BACKEND_URL = 'http://localhost:3004/api/local';

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
    private orderColumn: string = '';
    private orderDirection: string = 'ASC';
    private limitValue: number | null = null;
    private singleResult: boolean = false;

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

    order(column: string, options?: { ascending?: boolean }) {
        this.orderColumn = column;
        this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
        return this;
    }

    limit(count: number) {
        this.limitValue = count;
        return this;
    }

    single() {
        this.singleResult = true;
        this.limitValue = 1;
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

        if (this.orderColumn) {
            params.set('order', `${this.orderColumn}.${this.orderDirection}`);
        }

        if (this.limitValue !== null) {
            params.set('limit', this.limitValue.toString());
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

    async update(data: any) {
        try {
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                return { data: null, error: { message: error.message || 'Update failed' } };
            }

            const result = await response.json();
            return { data: result.data || result, error: null };
        } catch (error: any) {
            return { data: null, error: { message: error.message } };
        }
    }

    async delete() {
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
            const queryString = this.buildQueryParams();
            const url = `${this.baseUrl}/${this.tableName}${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                resolve({ data: null, error: { message: error.message || 'Query failed' } });
                return;
            }

            const result = await response.json();
            const data = this.singleResult ? (Array.isArray(result) ? result[0] : result) : result;
            resolve({ data: data || null, error: null });
        } catch (error: any) {
            resolve({ data: null, error: { message: error.message } });
        }
    }
}

export const localDb = new LocalDatabaseClient(BACKEND_URL);
