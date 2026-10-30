import { writeFile } from 'node:fs/promises';
import { identityApp } from './identity.ts';
import { ballotApp } from './ballot.ts';
import { managementApp } from './management.ts';
import { providerApp } from './provider.ts';
import { readConfig, required, Role } from './common.ts';

const role = Role.parse(process.argv[2]);
const config = await readConfig(role);
const publicOrigin = required(process.env.OPENVOTE_PUBLIC_ORIGIN);
if (role === 'ballot') await writeFile('.runtime/ballot/public-key.json', JSON.stringify({ publicKey: required(config.publicKey) }), { mode: 0o644 });
const app = role === 'identity' ? await identityApp(config, publicOrigin) : role === 'ballot' ? await ballotApp(config, publicOrigin)
  : role === 'management' ? await managementApp(config, publicOrigin) : await providerApp(config, publicOrigin);
await app.listen({ host: '127.0.0.1', port: config.port });
console.log(`${role}: ${config.environment} service listening on ${config.port}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void app.close(); });
