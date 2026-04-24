import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Exclude playwright from browser bundle - it requires Node.js
  build: {
    rollupOptions: {
      external: [
        'playwright',
        'playwright-core',
        'chromium-bidi',
        'ws',
        'http',
        'https',
        'net',
        'tls',
        'fs',
        'path',
        'os',
        'child_process',
        'readline',
        'stream',
        'zlib',
        'util',
        'events',
        'dns',
        'constants',
        'assert',
        'url',
        'buffer',
        'process',
        'tty',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['playwright', 'playwright-core'],
  },
});
