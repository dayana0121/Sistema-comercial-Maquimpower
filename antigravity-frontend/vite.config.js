import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // o el plugin que uses

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Cada vez que el frontend pida algo que empiece con /api
      // Vite lo enviará automáticamente a tu XAMPP
      '/api': {
        // Yo mantengo este target igual al .env para no mezclar proyectos locales.
        target: 'http://localhost/Sistema-comercial-Maquimpower/antigravity-backend',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Quita el /api antes de enviar al PHP
      },
    },
  },
})
