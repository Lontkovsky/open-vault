import { describe, expect, it } from 'vitest';
import { setTimeout } from 'node:timers/promises';
import { application } from '../apps/api/src/common.ts';

it('keeps a bounded eleven-second native-processing response connected', async () => {
  const app = await application({ environment: 'test', role: 'management', port: 0, serviceToken: 'synthetic-transport-test-token-not-a-real-secret' }, 'http://localhost:5173');
  let responseCompleted = false;
  app.post('/synthetic-processing', async () => { await setTimeout(11000); responseCompleted = true; return { state: 'Finished' }; });
  const origin = await app.listen({ host: '127.0.0.1', port: 0 });
  const started = Date.now();
  try {
    const response = await fetch(origin + '/synthetic-processing', { method: 'POST', signal: AbortSignal.timeout(15000) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: 'Finished' });
    expect(responseCompleted).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(11000);
  } finally { await app.close(); }
}, 20000);

describe('configured browser origin', () => {
  const config = { environment: 'demo' as const, role: 'management' as const, port: 0, serviceToken: 'synthetic-origin-test-token-not-a-real-secret' };

  it('accepts the local development origin only when it is explicitly configured', async () => {
    const app = await application({ ...config, environment: 'test' }, 'http://localhost:5173');
    try {
      expect((await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://localhost:5173' } })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://openvote.com.ua' } })).statusCode).toBe(403);
    } finally { await app.close(); }
  });

  it('accepts the exact configured origin and requests without an Origin header', async () => {
    const app = await application(config, 'https://openvote.com.ua');
    try {
      expect((await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://openvote.com.ua' } })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it.each(['http://openvote.com.ua', 'https://www.openvote.com.ua', 'https://openvote.com.ua.attacker.example', 'https://openvote.com.ua:444'])(
    'rejects foreign origin %s', async origin => {
      const app = await application(config, 'https://openvote.com.ua');
      try {
        const response = await app.inject({ method: 'GET', url: '/health', headers: { origin } });
        expect(response.statusCode).toBe(403);
        expect(response.json()).toEqual({ error: 'ORIGIN_REJECTED' });
      } finally { await app.close(); }
    });

  it.each(['http://openvote.com.ua', 'https://openvote.com.ua/path', 'https://user@openvote.com.ua'])(
    'refuses invalid demo public origin %s', async origin => {
      await expect(application(config, origin)).rejects.toThrow('INVALID_PUBLIC_ORIGIN');
    });
});
