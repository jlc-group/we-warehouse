import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8081,
    strictPort: false, // Allow automatic port selection if port is busy
    hmr: mode === 'development' ? {
      port: 8082, // Use separate port for HMR
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
    rollupOptions: mode === 'production' ? {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
          utils: ["date-fns", "lodash", "clsx"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts", "lucide-react"],
        },
      },
    } : {
      // Simplified chunking for development
      output: {
        manualChunks: undefined,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prioritize ESM versions of packages
    conditions: ['import', 'module', 'browser', 'default'],
    mainFields: ['browser', 'module', 'main'],
    // Help resolve Supabase module issues
    dedupe: ['@supabase/supabase-js', '@supabase/postgrest-js'],
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
    include: mode === 'development' ? [
      // Pre-bundle stable dependencies
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      // Include Supabase packages to resolve module issues
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/auth-js'
    ] : [],
    // Force Vite to handle these as ESM
    esbuildOptions: {
      target: 'esnext',
      format: 'esm',
      // Handle mixed module formats
      banner: {
        js: '// Vite ESM compatibility fix'
      }
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
