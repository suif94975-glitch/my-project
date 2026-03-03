import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import path from "path"; // 导入 path 模块

export default defineConfig({
  root: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"), // 告诉 Vite，@ 符号代表根目录
    },
  },
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
