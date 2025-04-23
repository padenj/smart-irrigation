import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      'pigpio', 
      'asd1115', 
      'i2c-bus', 
      'raspberrypi-liquid-crystal', 
      'lucide-react',
      '/src/server' // Add this to exclude the entire /src/server directory
    ],
  },
  build: {
    outDir: 'build/dist',
    sourcemap: true,
    rollupOptions: {      
      external: [
        'pigpio', 
        'asd1115', 
        'i2c-bus', 
        'raspberrypi-liquid-crystal', 
        '/src/server/hardware/relays.ts',
        '/src/server/hardware/sensors.ts',
        '/src/server/**' // Add this to exclude all files under /src/server
      ], 
    }, 
  }, 
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    },
    watch: {
      ignored: ['/src/server/**'], // Ignore the file during development
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
