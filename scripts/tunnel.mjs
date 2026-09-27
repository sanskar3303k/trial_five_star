import { spawn } from 'node:child_process';

function startTunnel() {
  console.log('[Tunnel] Launching persistent public tunnel...');
  const child = spawn('npx', ['--yes', 'localtunnel', '--port', '5000', '--local-host', '127.0.0.1'], {
    shell: true,
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error('[Tunnel Error]:', err.message);
  });

  child.on('close', (code) => {
    console.log(`[Tunnel] Process closed (code ${code}). Auto-reconnecting in 3 seconds...`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
