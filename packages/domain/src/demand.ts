import { z } from 'zod';
import { Answers, Question } from './index.ts';

export const demandPollId = 'platform-demand-v1';
export const demandQuestion = 'Чи потрібна вам незалежна відкрита платформа голосувань?';
export const demandAnswers = Answers;

export const DemandAnswer = z.enum(demandAnswers);
export const DemandResponse = z.strictObject({ answer: DemandAnswer });
export const DemandPollStatus = z.strictObject({
  apiVersion: z.literal('v1'),
  pollId: z.literal(demandPollId),
  version: z.literal(1),
  question: Question.pipe(z.literal(demandQuestion)),
  answers: z.tuple([
    z.literal(demandAnswers[0]),
    z.literal(demandAnswers[1]),
    z.literal(demandAnswers[2]),
  ]),
  selfSelected: z.literal(true),
  identityVerified: z.literal(false),
  uniquePersonGuaranteed: z.literal(false),
  response: DemandResponse.nullable(),
});
export const DemandResponseSubmission = z.strictObject({ answer: DemandAnswer });
export const DemandResponseReceipt = z.strictObject({ recorded: z.literal(true), answer: DemandAnswer });

export type DemandAnswerType = z.infer<typeof DemandAnswer>;
export type DemandPollStatusType = z.infer<typeof DemandPollStatus>;
export type DemandResponseReceiptType = z.infer<typeof DemandResponseReceipt>;
