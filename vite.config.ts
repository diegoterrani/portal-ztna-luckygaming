import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const revision =
    (process.env.VITE_GIT_COMMIT || process.env.GITHUB_SHA || '').slice(0, 7) || 'local';
  const builtAt = new Date().toISOString();

  return {
    // Se o portal rodar sob subpath (ex.: /portal/): exporte VITE_BASE_URL=/portal/
    base: env.VITE_BASE_URL || '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __PORTAL_VERSION__: JSON.stringify(pkg.version),
      __PORTAL_COMMIT__: JSON.stringify(revision),
      __PORTAL_BUILT_AT__: JSON.stringify(builtAt),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to reduce flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
