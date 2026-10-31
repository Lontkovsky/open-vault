import { z } from 'zod';
import { DemandChatResponse, DemandPollStatus, DemandResponseReceipt } from '../../../packages/domain/src/demand.ts';
import type { DemandAnswerType, DemandChatResponseType, DemandPollStatusType, DemandResponseReceiptType } from '../../../packages/domain/src/demand.ts';

const ApiError = z.strictObject({ error: z.string().regex(/^[A-Z][A-Z0-9_:/-]+$/) });

export class DemandApiFailure extends Error {
  status: number;
  constructor(code: string, status: number) { super(code); this.status = status; }
}

async function failure(response: Response): Promise<DemandApiFailure> {
  const value = ApiError.parse(await response.json());
  return new DemandApiFailure(value.error, response.status);
}

export async function loadDemandPoll(): Promise<DemandPollStatusType> {
  const response = await fetch('/api/v1/demand-poll', {
    method: 'GET', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw await failure(response);
  return DemandPollStatus.parse(await response.json());
}

export async function recordDemandResponse(answer: DemandAnswerType): Promise<DemandResponseReceiptType> {
  const response = await fetch('/api/v1/demand-poll', {
    method: 'POST', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer }),
  });
  if (!response.ok) throw await failure(response);
  return DemandResponseReceipt.parse(await response.json());
}

export async function askDemandChat(question: string): Promise<DemandChatResponseType> {
  const response = await fetch('/api/v1/demand-chat', {
    method: 'POST', credentials: 'same-origin', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(25000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }),
  });
  if (!response.ok) throw await failure(response);
  return DemandChatResponse.parse(await response.json());
}
