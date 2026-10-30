import cookie from '@fastify/cookie';
import type pg from 'pg';
import { z } from 'zod';
import {
  DemandAnswer,
  DemandPollStatus,
  DemandResponseReceipt,
  DemandResponseSubmission,
  demandAnswers,
  demandPollId,
  demandQuestion,
} from '../../../packages/domain/src/demand.ts';
import { application, Failure, sha, token, transaction } from './common.ts';
import type { ConfigType } from './common.ts';

export const demandCredentialCookie = 'openvote_demand_credential';
const DemandCredential = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

function credential(value: string | undefined): string {
  if (value === undefined) throw new Failure('DEMAND_CREDENTIAL_REQUIRED', 401);
  const parsed = DemandCredential.safeParse(value);
  if (!parsed.success) throw new Failure('INVALID_DEMAND_CREDENTIAL', 400);
  return parsed.data;
}

export async function demandApp(
  pool: pg.Pool,
  environment: ConfigType['environment'],
  publicOrigin: string,
) {
  const app = await application({ environment, role: 'demand' }, publicOrigin);
  await app.register(cookie);
  app.addHook('onClose', () => pool.end());
  const secureCookie = new URL(publicOrigin).protocol === 'https:';

  app.get('/api/v1/demand-poll', async (request, reply) => {
    const current = request.cookies[demandCredentialCookie];
    const rawCredential = current === undefined ? token() : credential(current);
    const result = await pool.query<{ answer: string }>(
      'SELECT answer FROM demand_responses WHERE poll_id=$1 AND credential_hash=$2',
      [demandPollId, sha(rawCredential)],
    );
    if (current === undefined) {
      reply.setCookie(demandCredentialCookie, rawCredential, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: secureCookie,
        maxAge: 31_536_000,
      });
    }
    const stored = result.rows[0];
    return DemandPollStatus.parse({
      apiVersion: 'v1',
      pollId: demandPollId,
      version: 1,
      question: demandQuestion,
      answers: demandAnswers,
      selfSelected: true,
      identityVerified: false,
      uniquePersonGuaranteed: false,
      response: stored === undefined ? null : { answer: DemandAnswer.parse(stored.answer) },
    });
  });

  app.post('/api/v1/demand-poll', async (request) => {
    if (request.headers.origin !== publicOrigin) throw new Failure('ORIGIN_REJECTED', 403);
    const input = DemandResponseSubmission.parse(request.body);
    const rawCredential = credential(request.cookies[demandCredentialCookie]);
    const credentialHash = sha(rawCredential);
    await transaction(pool, async client => {
      const inserted = await client.query<{ answer: string }>(
        `INSERT INTO demand_responses(poll_id,poll_version,credential_hash,answer)
         VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING answer`,
        [demandPollId, 1, credentialHash, input.answer],
      );
      if (inserted.rows.length === 1) return;
      const prior = await client.query<{ answer: string }>(
        'SELECT answer FROM demand_responses WHERE poll_id=$1 AND credential_hash=$2 FOR UPDATE',
        [demandPollId, credentialHash],
      );
      const priorAnswer = DemandAnswer.parse(prior.rows[0]?.answer);
      if (priorAnswer !== input.answer) throw new Failure('FINAL_RESPONSE_ALREADY_RECORDED', 409);
    });
    return DemandResponseReceipt.parse({ recorded: true, answer: input.answer });
  });

  return app;
}
