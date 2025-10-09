/**
 * Cloudflare Workers - API Proxy
 * Purpose: Proxy HTTP backend requests through HTTPS
 * Deploy: wrangler deploy
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Backend endpoints
      const backends = {
        '/api/sales': 'http://localhost:3001/api/sales',
        '/jhdb': 'http://jhserver.dyndns.info:82/jhdb',
      };

      let targetUrl = null;

      // Match backend
      for (const [prefix, backend] of Object.entries(backends)) {
        if (url.pathname.startsWith(prefix)) {
          targetUrl = backend + url.pathname.slice(prefix.length) + url.search;
          break;
        }
      }

      if (!targetUrl) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      // Forward request
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });

      // Clone and add CORS headers
      const modifiedResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        modifiedResponse.headers.set(key, value);
      });

      return modifiedResponse;

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
