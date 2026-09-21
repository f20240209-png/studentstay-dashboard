import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
// Loopback only: the local development identity must never become public auth.
process.argv=[process.execPath,fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url)),'--host','127.0.0.1','--port','5173','--strictPort'];
await import('../node_modules/vite/bin/vite.js');
