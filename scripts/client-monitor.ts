import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { ClientReleaseManifest } from '../packages/domain/src/release.ts';

function fail(code: string): never { throw new Error(code); }
function trustedOrigin(input: unknown): string {
  const origin = z.url().parse(input);
  const parsed = new URL(origin);
  if (parsed.origin !== origin || parsed.username !== '' || parsed.password !== '') return fail('CLIENT_ORIGIN_INVALID');
  if (parsed.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(parsed.hostname)) return fail('CLIENT_HTTPS_REQUIRED');
  if (!['http:', 'https:'].includes(parsed.protocol)) return fail('CLIENT_ORIGIN_INVALID');
  return origin;
}

async function exactBody(response: Response, expectedBytes: number): Promise<Buffer> {
  if (response.body === null) return fail('CLIENT_ARTIFACT_UNAVAILABLE');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > expectedBytes) { await reader.cancel(); return fail('CLIENT_ARTIFACT_MISMATCH'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  if (size !== expectedBytes) return fail('CLIENT_ARTIFACT_MISMATCH');
  return Buffer.concat(chunks);
}

export async function monitorClient(manifestInput: unknown, originInput: unknown) {
  const manifest = ClientReleaseManifest.parse(manifestInput), origin = trustedOrigin(originInput);
  for (const file of manifest.files) {
    let response: Response;
    try {
      response = await fetch(origin + file.path, { credentials: 'omit', cache: 'no-store', redirect: 'error',
        referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000) });
    } catch { return fail('CLIENT_ARTIFACT_UNAVAILABLE'); }
    if (response.status !== 200) return fail('CLIENT_ARTIFACT_UNAVAILABLE');
    const body = await exactBody(response, file.bytes);
    if (createHash('sha256').update(body).digest('hex') !== file.sha256) return fail('CLIENT_ARTIFACT_MISMATCH');
  }
  return { status: 'ClientReleaseVerified' as const, client: manifest.client, sourceCommit: manifest.sourceCommit,
    treeSha256: manifest.treeSha256, files: manifest.files.length };
}

async function main() {
  const [manifestFile, origin] = z.tuple([z.string().min(1), z.string().min(1)]).parse(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  console.log(JSON.stringify(await monitorClient(manifest, origin)));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch(error => {
    console.error(error instanceof Error && /^[A-Z][A-Z0-9_]{1,100}$/.test(error.message) ? error.message : 'CLIENT_MONITOR_FAILED');
    process.exitCode = 1;
  });
}
