import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: mode === 'development' ? {
      overlay: true, // Show errors in overlay
    } : false, // Enable HMR only in development
    // Enable CSS HMR in development for better UX
    css: {
      hmr: mode === 'development',
    },
    // Optimize file watching - LIMIT scope to reduce overhead
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/coverage/**',
        '**/temp/**',
        '**/tmp/**',
        '**/*.log',
        '**/*.test.*',
        '**/*.spec.*',
        '**/supabase/migrations/**',
        '**/.vite/**',
        '**/package-lock.json',
        '**/*.md'
      ],
      usePolling: false,
      // Reduce intervals to minimize file system load
      interval: 2000,
      binaryInterval: 3000,
      depth: 3,
    },
    // Fix WebSocket connection issues and file system performance
    fs: {
      strict: false,
      cachedChecks: true, // Enable caching for better performance
    },
    // Development-friendly settings
    open: false,
    cors: true,
  },
  build: {
    outDir: "dist",
    sourcemap: mode === 'development',
    // Force cache busting for production builds
    assetsInlineLimit: 0,
    // Optimize build speed for Cloudflare Pages
    minify: 'esbuild', // Faster than terser
    target: 'esnext',
    rollupOptions: {
      output: {
        // Add entryFileNames with hash to force new bundle names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Optimize chunking to speed up build
        manualChunks: (id) => {
          // Vendor chunks for faster builds
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            // ✅ ลบการแยก React และ Radix ออก - ให้อยู่กับ vendor เพื่อป้องกัน loading order issues
            // if (id.includes('react') || id.includes('react-dom')) return 'react';
            // if (id.includes('@radix-ui')) return 'radix';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Speed up build
    reportCompressedSize: false,
    cssCodeSplit: true,
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force all React imports to use the same instance
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime')
    },
    // Prioritize ESM versions of packages
    conditions: ['import', 'module', 'browser', 'default'],
    mainFields: ['browser', 'module', 'main'],
    // Help resolve Supabase module issues and dedupe React
    dedupe: ['react', 'react-dom', '@supabase/supabase-js', '@supabase/postgrest-js'],
  },
  ssr: {
    // Mark these as external for SSR to avoid module resolution issues
    noExternal: mode === 'development' ? [] : ['@supabase/supabase-js']
  },
  optimizeDeps: {
    exclude: mode === 'development' ? [
      // Exclude problematic dependencies in development
      'chunk-XHSRBMDX',
      'lovable-tagger'
    ] : [],
    include: [
      // Always pre-bundle these dependencies
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
    ].concat(mode === 'development' ? [
      // Additional dev-only includes
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/auth-js'
    ] : []),
    // Force Vite to handle these as ESM
    esbuildOptions: {
      target: 'esnext',
      format: 'esm',
      // Handle mixed module formats
      banner: {
        js: '// Vite ESM compatibility fix'
      },
      jsx: 'automatic',
      jsxImportSource: 'react'
    },
    // Speed up dependency pre-bundling
    force: mode === 'development',
    entries: mode === 'development' ? ['./src/main.tsx'] : undefined,
  },
  // Additional configuration for handling mixed module types
  define: {
    // Help with CommonJS compatibility
    global: 'globalThis',
  },
  // Handle module format issues in build
  esbuild: {
    // Convert CommonJS to ESM when needed
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));
