import cookie from '@fastify/cookie';
import type pg from 'pg';
import { z } from 'zod';
import {
  DemandAnswer,
  DemandPollResults,
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

async function demandSnapshot(client: pg.Pool | pg.PoolClient, credentialHash: string) {
  const result = await client.query<{
    current_answer: string | null;
    total_responses: number;
    support: number;
    oppose: number;
    abstain: number;
  }>(
    `SELECT
       max(answer) FILTER (WHERE credential_hash=$2) AS current_answer,
       count(*)::integer AS total_responses,
       (count(*) FILTER (WHERE answer=$3))::integer AS support,
       (count(*) FILTER (WHERE answer=$4))::integer AS oppose,
       (count(*) FILTER (WHERE answer=$5))::integer AS abstain
     FROM demand_responses
     WHERE poll_id=$1 AND poll_version=1`,
    [demandPollId, credentialHash, demandAnswers[0], demandAnswers[1], demandAnswers[2]],
  );
  const row = result.rows[0];
  if (row === undefined) throw new Error('DEMAND_SNAPSHOT_MISSING');
  return {
    response: row.current_answer === null ? null : { answer: DemandAnswer.parse(row.current_answer) },
    results: DemandPollResults.parse({
      totalResponses: row.total_responses,
      counts: [row.support, row.oppose, row.abstain],
    }),
  };
}

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
    const snapshot = await demandSnapshot(pool, sha(rawCredential));
    if (current === undefined) {
      reply.setCookie(demandCredentialCookie, rawCredential, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: secureCookie,
        maxAge: 31_536_000,
      });
    }
    return DemandPollStatus.parse({
      apiVersion: 'v1',
      pollId: demandPollId,
      version: 1,
      question: demandQuestion,
      answers: demandAnswers,
      selfSelected: true,
      identityVerified: false,
      uniquePersonGuaranteed: false,
      response: snapshot.response,
      results: snapshot.results,
    });
  });

  app.post('/api/v1/demand-poll', async (request) => {
    if (request.headers.origin !== publicOrigin) throw new Failure('ORIGIN_REJECTED', 403);
    const input = DemandResponseSubmission.parse(request.body);
    const rawCredential = credential(request.cookies[demandCredentialCookie]);
    const credentialHash = sha(rawCredential);
    const snapshot = await transaction(pool, async client => {
      const inserted = await client.query<{ answer: string }>(
        `INSERT INTO demand_responses(poll_id,poll_version,credential_hash,answer)
         VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING answer`,
        [demandPollId, 1, credentialHash, input.answer],
      );
      if (inserted.rows.length === 0) {
        const prior = await client.query<{ answer: string }>(
          'SELECT answer FROM demand_responses WHERE poll_id=$1 AND credential_hash=$2 FOR UPDATE',
          [demandPollId, credentialHash],
        );
        const priorAnswer = DemandAnswer.parse(prior.rows[0]?.answer);
        if (priorAnswer !== input.answer) throw new Failure('FINAL_RESPONSE_ALREADY_RECORDED', 409);
      }
      return demandSnapshot(client, credentialHash);
    });
    return DemandResponseReceipt.parse({ recorded: true, answer: input.answer, results: snapshot.results });
  });

  return app;
}
