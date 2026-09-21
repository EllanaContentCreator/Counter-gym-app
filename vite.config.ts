import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const base = process.env.VITE_BASE ?? "/";

/**
 * A human-readable stamp for the build, shown in Me → About.
 * When someone says "I can't see the new thing", this says which build their
 * phone is actually running, instead of everyone guessing.
 */
const buildId = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "icons/*.svg", "exercises/*", "fonts/*"],
      manifest: {
        name: "Counter — Accountability Training",
        short_name: "Counter",
        description:
          "Carolyn Counter's training programs in your pocket. Log your weights, count your reps, stay accountable.",
        theme_color: "#6D28D9",
        background_color: "#FAF7FF",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webp,jpg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { port: 5173, host: true },
});
