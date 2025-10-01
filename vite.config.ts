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
    hmr: mode === 'development' ? {
      overlay: true, // Show errors in overlay
    } : false, // Enable HMR only in development
    // Enable CSS HMR in development for better UX
    css: {
      hmr: mode === 'development',
    },
    // Optimize file watching for development vs production
    watch: mode === 'development' ? {
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
        '**/supabase/migrations/**'
      ],
      usePolling: false,
      interval: 1000, // Faster updates in development
      binaryInterval: 2000,
    } : {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/.*/**',
        '**/coverage/**',
        '**/temp/**',
        '**/tmp/**',
        '**/*.log',
        '**/*.md',
        '**/*.test.*',
        '**/*.spec.*',
        '**/CLAUDE.md',
        '**/README.md',
        '**/supabase/migrations/**',
        '**/src/data/**',
        '**/src/integrations/supabase/types*.ts'
      ],
      usePolling: false,
      interval: 10000,
      binaryInterval: 15000,
      depth: 2,
    },
    // Fix WebSocket connection issues
    fs: {
      strict: false,
    },
    // Development-friendly settings
    open: mode === 'development' ? false : false, // Don't auto-open browser
    cors: true, // Enable CORS to prevent refresh issues
  },
  build: {
    outDir: "dist",
    sourcemap: mode === 'development',
    // Force cache busting for production builds
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Add entryFileNames with hash to force new bundle names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Let Vite handle chunking automatically - no manual chunks
        manualChunks: undefined,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
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
