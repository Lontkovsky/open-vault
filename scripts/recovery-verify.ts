import { link, mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { digest } from '../packages/domain/src/checkpoints.ts';
import { Observation, ObserverConfig, RecoveryApproval } from '../packages/domain/src/observer.ts';
import { observePublic } from './observer-client.ts';

async function main() {
  const [configFile, priorFile, output] = z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]).parse(process.argv.slice(2));
  const config = ObserverConfig.parse(JSON.parse(await readFile(configFile, 'utf8')));
  const prior = Observation.parse(JSON.parse(await readFile(priorFile, 'utf8')));
  const { observation } = await observePublic(config, prior);
  const approval = RecoveryApproval.parse({ format: 'openvote-recovery-approval-v1', pollId: config.trust.pollId,
    observationHash: digest(JSON.stringify(observation)), checkpoints: observation.checkpoints.length,
    verification: observation.verification, publishedArchiveHash: observation.publishedArchiveHash });
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  const pending = output + '.pending-' + randomUUID();
  try {
    const file = await open(pending, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(approval, null, 2) + '\n'); await file.sync(); } finally { await file.close(); }
    await link(pending, output);
    const directory = await open(dirname(output), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    console.log(JSON.stringify({ pollId: approval.pollId, status: 'RecoveryEvidenceVerified', observationHash: approval.observationHash }));
  } finally { await rm(pending, { force: true }); }
}

try { await main(); }
catch (error) {
  const code = error instanceof Error && /^[A-Z][A-Z0-9_]{1,100}$/.test(error.message) ? error.message : 'RECOVERY_VERIFICATION_FAILED';
  console.error(code); process.exitCode = 1;
}
