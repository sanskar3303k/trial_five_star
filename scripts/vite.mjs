import { build, createServer } from 'vite';
import react from '@vitejs/plugin-react';
const config = { configFile: false, plugins: [react()], server: { port: 3000, proxy: { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true } } }, build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } } };
if (process.argv.includes('--build')) await build(config);
else { const server = await createServer(config); await server.listen(); server.printUrls(); }
