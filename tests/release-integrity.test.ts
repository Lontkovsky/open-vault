import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { ClientReleaseManifest } from '../packages/domain/src/release.ts';
import { monitorClient } from '../scripts/client-monitor.ts';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('independent client release monitor', () => {
  it('accepts the trusted release and detects server-side JavaScript substitution', async () => {
    let script = 'globalThis.openVoteRelease = "trusted";\n';
    const html = '<!doctype html><script type="module" src="/assets/app.js"></script>\n';
    const manifest = ClientReleaseManifest.parse({ format: 'openvote-client-release-v1', client: 'full', sourceCommit: 'a'.repeat(40),
      treeSha256: 'b'.repeat(64), files: [
        { path: '/', artifact: 'index.html', bytes: Buffer.byteLength(html), sha256: sha256(html) },
        { path: '/assets/app.js', artifact: 'assets/app.js', bytes: Buffer.byteLength(script), sha256: sha256(script) },
      ] });
    const server = createServer((request, response) => {
      if (request.url === '/') response.end(html);
      else if (request.url === '/assets/app.js') response.end(script);
      else { response.statusCode = 404; response.end(); }
    });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('CLIENT_MONITOR_TEST_SERVER_MISSING');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      await expect(monitorClient(manifest, origin)).resolves.toMatchObject({ status: 'ClientReleaseVerified', files: 2 });
      script = 'globalThis.openVoteRelease = "substituted";\n';
      await expect(monitorClient(manifest, origin)).rejects.toThrow('CLIENT_ARTIFACT_MISMATCH');
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
