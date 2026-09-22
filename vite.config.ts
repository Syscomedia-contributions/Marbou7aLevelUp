import { defineConfig, type HmrContext } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Force a full page reload on every HMR update so the preview iframe
// (especially mobile) never keeps stale components/CSS in memory.
const forceFullReload = () => ({
  name: "force-full-reload",
  enforce: "post" as const,
  handleHotUpdate({ server }: HmrContext) {
    server.ws.send({ type: "full-reload", path: "*" });
    return [];
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), forceFullReload()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
            "@radix-ui/react-accordion",
            "@radix-ui/react-dropdown-menu",
          ],
          "i18n-vendor": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          "query-vendor": ["@tanstack/react-query"],
        },
      },
    },
  },
}));
