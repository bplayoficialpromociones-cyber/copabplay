import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function copyPublicSafe() {
  return {
    name: 'copy-public-safe',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');
      const skipPatterns = [' copy', ' copy copy', '(1)'];

      function copyDirSafe(src: string, dest: string) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
          const shouldSkip = skipPatterns.some(p => entry.includes(p));
          if (shouldSkip) continue;
          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isDirectory()) {
              copyDirSafe(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          } catch {
            // skip unreadable files
          }
        }
      }

      if (fs.existsSync(publicDir)) {
        copyDirSafe(publicDir, distDir);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicSafe()],
  base: '/',
  publicDir: 'public',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
});
