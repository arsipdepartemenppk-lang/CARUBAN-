import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  base: '/CARUBAN-/' // arsipdepartemenppk-lang/
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
    },
    build: {
      outDir: 'dist',
    },
    plugins: [
      react(), 
      tailwindcss(),
      nodePolyfills({
        globals: {
          process: false,
          Buffer: true,
          global: true,
        },
      }),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module'
        },
        manifest: {
          name: 'Caruban Digital',
          short_name: 'Caruban',
          description: 'Aplikasi Manajemen Organisasi PC IPNU Cirebon',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/1043/1043306.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 50000000
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      hmr: false,
    },
  };
});
