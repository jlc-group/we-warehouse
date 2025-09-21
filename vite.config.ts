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
      // ลด HMR frequency เพื่อประหยัด resources
      clientPort: 8081,
    },
    // ลด file watching เพื่อประหยัด CPU
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      usePolling: false, // ปิด polling เพื่อประหยัด CPU
    },
    // Fix WebSocket connection issues
    fs: {
      strict: false,
    },
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
