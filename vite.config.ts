import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Deployed at https://notmutlvq.github.io/Emberfall/ — a GitHub Pages
// project site, so the app is served from the /Emberfall/ sub-path. If this
// ever moves to a domain root, set base back to "/".
const BASE = "/Emberfall/";

export default defineConfig({
  base: BASE,
  build: {
    target: "es2022",
    // Keep every asset as a real hashed file, including the tiny 9-slice
    // UI PNGs — the point of extracting them from the prototype's base64
    // blobs was to stop shipping images as inline text.
    assetsInlineLimit: 0,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "سقوط الجمر",
        short_name: "سقوط الجمر",
        description: "لعبة روغلايك عربية — اهبط في الأعماق، الموت ينهي الجولة.",
        lang: "ar",
        dir: "rtl",
        display: "standalone",
        orientation: "portrait",
        background_color: "#12141f",
        theme_color: "#12141f",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the shell + assets + the tiny SFX one-shots (~75 KB). The
        // music beds (~3 MB) are runtime-cached on first play instead of
        // bloating the install.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}", "sfx/*.ogg"],
        cleanupOutdatedCaches: true,
        // Precache is the local app shell + assets → loads offline up to the
        // login screen. Supabase requests are deliberately never cached.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/music/"),
            handler: "CacheFirst",
            options: {
              cacheName: "emberfall-music",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
