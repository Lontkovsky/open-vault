import { z } from 'zod';

export const ReleaseArtifact = z.strictObject({
  path: z.string().regex(/^\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*$/),
  artifact: z.string().regex(/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).refine(file => !file.path.split('/').some(segment => segment === '.' || segment === '..')
  && !file.artifact.split('/').some(segment => segment === '.' || segment === '..'), 'RELEASE_PATH_INVALID');

export const ClientReleaseManifest = z.strictObject({
  format: z.literal('openvote-client-release-v1'),
  client: z.enum(['full', 'demand']),
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
  treeSha256: z.string().regex(/^[0-9a-f]{64}$/),
  files: z.array(ReleaseArtifact).min(1),
}).superRefine((manifest, context) => {
  const paths = manifest.files.map(file => file.path);
  const artifacts = manifest.files.map(file => file.artifact);
  if (new Set(paths).size !== paths.length) context.addIssue({ code: 'custom', message: 'RELEASE_PATH_DUPLICATED' });
  if (new Set(artifacts).size !== artifacts.length) context.addIssue({ code: 'custom', message: 'RELEASE_ARTIFACT_DUPLICATED' });
  if (paths.filter(path => path === '/').length !== 1) context.addIssue({ code: 'custom', message: 'RELEASE_ENTRYPOINT_REQUIRED' });
  if (JSON.stringify(paths) !== JSON.stringify([...paths].sort())) context.addIssue({ code: 'custom', message: 'RELEASE_PATHS_NOT_SORTED' });
});

export type ClientReleaseManifestType = z.infer<typeof ClientReleaseManifest>;
