import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import csp from 'vite-plugin-csp';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    csp({
      policy: {
        'default-src': ["self"],
        'script-src': ["self", "unsafe-inline", "https://static.cloudflareinsights.com"],
        'style-src': ["self", "unsafe-inline", "https://si.padenco.com"],
        'style-src-elem': ["self", "unsafe-inline", "https://si.padenco.com"],
        'img-src': ["self", "https://cdn.weatherapi.com", "https://openweathermap.org"],
        // Add other directives as needed
      }
    })
  ],
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
