import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

export default defineConfig({
  root: "./",
  plugins: [
    react(),
    tailwindcss(),
    jsxLocPlugin({
      projectRoot: "/vercel/path0",
    }),
    vitePluginManusRuntime(),
  ],
  build: {
    rollupOptions: {
      input: "./index.html",
    },
  },
});
