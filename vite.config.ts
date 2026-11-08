import { defineConfig } from "vite";
import type { PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import { injectHead } from "./server/services/head-inject";
import { canonicalFor } from "./client/src/lib/seo-core";
import { NOT_FOUND_META, STATIC_PAGE_META } from "./client/src/lib/page-meta";

// Writes the page-specific <head> tags into the built HTML shell for crawlers that do not run
// JavaScript (link previews, and any crawler before it renders the page):
//  - index.html is what Vercel serves for "/", so it gets the landing page's tags. The server
//    (api/page.ts) starts from this same file and swaps in the tags of the page requested.
//  - 404.html is what Vercel serves, with a 404 status, for URLs that match no file or page route
//    (see the explicit page list in vercel.json). Using the app shell means a visitor still gets
//    the app's own "Page Not Found" screen, and crawlers get a real 404 that is not indexed.
const staticHtmlPages = (): PluginOption => ({
  name: "static-html-pages",
  apply: "build",
  closeBundle() {
    const outDir = path.resolve(process.cwd(), "dist/public");
    const shell = readFileSync(path.join(outDir, "index.html"), "utf8");
    const home = STATIC_PAGE_META["/"];

    writeFileSync(
      path.join(outDir, "index.html"),
      injectHead(shell, { title: home.title, description: home.description, canonical: canonicalFor("/") })
    );
    writeFileSync(
      path.join(outDir, "404.html"),
      injectHead(shell, { title: NOT_FOUND_META.title, description: NOT_FOUND_META.description, noindex: true })
    );
  },
});

export default defineConfig(async () => {
  const plugins: PluginOption[] = [react(), staticHtmlPages()];

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