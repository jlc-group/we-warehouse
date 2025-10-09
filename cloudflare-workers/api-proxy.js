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
      // Backend endpoints mapping - ทั้งหมดชี้ไปที่ backend :3001
      const backends = [
        {
          prefix: '/api/sales',
          target: 'http://jhserver.dyndns.info:3001',
          replacePath: false // เก็บ path เดิม
        }
      ];

      let targetUrl = null;

      // Match backend และสร้าง URL
      for (const backend of backends) {
        if (url.pathname.startsWith(backend.prefix)) {
          // เก็บ path เดิมทั้งหมด
          targetUrl = backend.target + url.pathname + url.search;
          break;
        }
      }

      if (!targetUrl) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      // Forward request with proper headers
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete('host'); // ลบ host header เพื่อไม่ให้เกิด conflict

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
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
