import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pigpio', 'asd1115', 'i2c-bus', 'raspberrypi-liquid-crystal', 'lucide-react'],
  },
  build: {
    outDir: 'build/dist',
    sourcemap: true,
    rollupOptions: {      
      external: ['pigpio', 'asd1115', 'i2c-bus', 'raspberrypi-liquid-crystal', '/src/server/relays.ts'], 
    }, 
  }, 
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
});
