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
    hmr: false, // CRITICAL: COMPLETELY DISABLE HMR to prevent auto-refreshes
    // CRITICAL: Disable CSS preprocessing that triggers rebuilds
    css: {
      hmr: false, // Disable CSS HMR completely
    },
    // CRITICAL: Optimize file watching to PREVENT auto-refreshes
    watch: {
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
      usePolling: false, // Use native file watching instead of polling
      interval: 10000, // Check files every 10 seconds to reduce sensitivity significantly
      binaryInterval: 15000, // Check binary files much less frequently
      depth: 2, // Limit depth of file watching
    },
    // Fix WebSocket connection issues
    fs: {
      strict: false,
    },
    // Reduce memory usage and prevent frequent refreshes
    open: false, // Don't auto-open browser
    cors: true, // Enable CORS to prevent refresh issues
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
          utils: ["date-fns", "lodash", "clsx"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts", "lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
