import { defineConfig } from "vite";
import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync } from "fs";

// Vercel serves 404.html, with a 404 status, for URLs that match no file or rewrite (see the
// explicit page list in vercel.json). Using the app shell as that page means a visitor still gets
// the app's own "Page Not Found" screen, and crawlers get a real 404.
const spa404Page = (): PluginOption => ({
  name: "spa-404-page",
  apply: "build",
  closeBundle() {
    const outDir = path.resolve(process.cwd(), "dist/public");
    copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html"));
  },
});

export default defineConfig(async () => {
  const plugins: PluginOption[] = [react(), spa404Page()];

  // Only load Replit plugins in Replit environment
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const { cartographer } = await import("@replit/vite-plugin-cartographer");
      const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal");
      const replitPlugins: PluginOption[] = [
        runtimeErrorOverlay.default(),
        cartographer()
      ];
      plugins.push(...replitPlugins);
    } catch (error) {
      console.warn("Replit plugins not available, skipping...");
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "client", "src"),
        "@shared": path.resolve(process.cwd(), "shared"),
        "@assets": path.resolve(process.cwd(), "attached_assets"),
      },
    },
    root: path.resolve(process.cwd(), "client"),
    build: {
      outDir: path.resolve(process.cwd(), "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: 5002,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});