import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Fix pour ESM - obtenir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    // Plugins Replit désactivés hors Replit
    ...(process.env.REPL_ID !== undefined
      ? [
          // Ces plugins ne sont disponibles que sur Replit
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|wouter)\//.test(id)) return "react-core";
          if (id.includes("node_modules/framer-motion/")) return "motion";
          if (id.includes("node_modules/recharts/")) return "charts";
          if (id.includes("node_modules/@radix-ui/")) return "radix-ui";
          if (/node_modules\/(react-markdown|remark-|rehype-|unified|marked)\//.test(id)) return "markdown";
          if (id.includes("node_modules/@sentry/")) return "sentry";
          if (/node_modules\/(lucide-react|react-icons)\//.test(id)) return "icons";
          if (id.includes("node_modules/@tanstack/")) return "query";
          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
