import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    // Keep every asset as a real hashed file, including the tiny 9-slice
    // UI PNGs — the brief's whole point in extracting them out of the
    // prototype's base64 blobs was to stop shipping images as inline text.
    assetsInlineLimit: 0,
  },
});
