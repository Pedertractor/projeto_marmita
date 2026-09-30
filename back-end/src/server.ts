import { app } from './app.js';
import { env } from './env/index.js';

// Prefer dual-stack (::) when HOST is 0.0.0.0 so `localhost` (IPv6 ::1)
// connects without the Windows fallback delay to IPv4.
const host = env.HOST === '0.0.0.0' ? '::' : env.HOST;

app.listen({ host, port: +env.PORT }).then(() => {
  console.log('Server running!', `${host}:${env.PORT}`);
});
