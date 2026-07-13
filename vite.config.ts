import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Paquets workspace consommés en source TS + lib d'icônes : pas de pré-bundling.
    exclude: ['lucide-react', '@atlas-baobab/twin-engine', '@atlas-baobab/sync', '@atlas-baobab/ui', '@atlas-baobab/moderation'],
  },
  server: {
    fs: { allow: ['..'] },
  },
});
