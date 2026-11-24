import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app runs on :5173 and forwards API calls to the Express server on :5050.
const API = process.env.VITE_API_PROXY || 'http://localhost:5050';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
});
