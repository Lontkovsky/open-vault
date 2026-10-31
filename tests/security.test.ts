import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const Evidence = z.strictObject({
  id: z.enum(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11']),
  title: z.string().min(1), attackerCapabilities: z.string().min(1), trustBoundary: z.string().min(1),
  controls: z.string().min(1), residualRisk: z.string().min(1), requirements: z.array(z.string().min(1)).min(1),
  issues: z.array(z.url()).min(1), prs: z.array(z.url()),
  defenseOutcome: z.enum(['Prevented', 'Detected', 'PartiallyMitigated', 'KnownLimitation']),
  evidenceState: z.enum(['NotTested', 'AutomatedTested', 'ExternallyReviewed']),
  implementationState: z.enum(['NotImplemented', 'Partial', 'Implemented']),
  verification: z.array(z.string().min(1)), actualEvidence: z.array(z.string().min(1)),
  remainingAcceptanceCriteria: z.string().min(1),
});
const Registry = z.strictObject({ schemaVersion: z.literal(1), statusAuthority: z.literal('GitHub Issues/Projects'),
  scope: z.string().min(1), scenarios: z.array(Evidence).length(11) });

describe('machine-readable adversarial registry', () => {
  it('keeps A01-A11 complete and separates outcomes from evidence', async () => {
    const registry = Registry.parse(JSON.parse(await readFile('docs/attack-coverage.json', 'utf8')));
    expect(registry.scenarios.map(value => value.id)).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11']);
    expect(new Set(registry.scenarios.map(value => value.id)).size).toBe(11);
    for (const scenario of registry.scenarios) {
      if (scenario.evidenceState === 'NotTested') {
        expect(scenario.verification).toEqual([]);
        expect(scenario.actualEvidence).toEqual([]);
      } else {
        expect(scenario.verification.length).toBeGreaterThan(0);
        expect(scenario.actualEvidence.length).toBeGreaterThan(0);
      }
    }
  });
});
