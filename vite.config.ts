import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import path from "path";

export default defineConfig({
  root: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"), 
      // 添加下面这一行，告诉 Vite @shared 就在根目录下的 shared 文件夹
      "@shared": path.resolve(__dirname, "./shared"), 
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
