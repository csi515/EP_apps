/**
 * Docker Postgres health 대기
 * 사용: node scripts/wait-local-postgres.mjs
 */
import net from 'node:net';

const host = process.env.EP_PG_HOST || '127.0.0.1';
const port = Number(process.env.EP_PG_PORT || 54329);
const deadline = Date.now() + Number(process.env.EP_PG_WAIT_MS || 60_000);

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

while (Date.now() < deadline) {
  if (await canConnect()) {
    console.log(`postgres ready at ${host}:${port}`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}

console.error(`postgres not ready at ${host}:${port} (timeout)`);
process.exit(1);
