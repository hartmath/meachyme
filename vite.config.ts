import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "/",
  server: {
    port: 5173,
    host: true,
    open: true
  },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false, // Disable sourcemaps in production for better performance
        minify: 'terser',
        rollupOptions: {
          output: {
            format: 'es',
            manualChunks: {
              // Vendor chunks for better caching
              'react-vendor': ['react', 'react-dom'],
              'router-vendor': ['react-router-dom'],
              'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
              'supabase-vendor': ['@supabase/supabase-js'],
              'query-vendor': ['@tanstack/react-query'],
              'utils-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
            },
            entryFileNames: '[name].[hash].js',
            chunkFileNames: '[name].[hash].js',
            assetFileNames: '[name].[hash][extname]'
          }
        },
        chunkSizeWarningLimit: 1000,
        // Performance optimizations
        target: 'esnext',
        cssCodeSplit: true,
        reportCompressedSize: false, // Disable compressed size reporting for faster builds
      },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react'
    ]
  }
})