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
    hmr: {
      port: 8081, // HMR port should match server port
      overlay: false, // Disable error overlay that might cause WebSocket issues
      clientPort: 8081,
      timeout: 120000, // Increase timeout to prevent frequent reconnections
    },
    // Optimize file watching to reduce refreshes significantly
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
        '**/*.spec.*'
      ],
      usePolling: false, // Use native file watching instead of polling
      interval: 3000, // Check files every 3 seconds to reduce sensitivity
      binaryInterval: 5000, // Check binary files less frequently
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
