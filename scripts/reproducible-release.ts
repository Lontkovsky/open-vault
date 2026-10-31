import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { ClientReleaseManifest } from '../packages/domain/src/release.ts';
import type { ClientReleaseManifestType } from '../packages/domain/src/release.ts';

const cryptoImage = 'openvote-crypto:3.3.0';
const cryptoFiles = ['belenios.js', 'libsodium.wasm', 'COPYING.belenios', 'LICENSE.libsodium'] as const;
const sourcePaths = ['.gitmodules', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json',
  'apps/web', 'packages/domain', 'infra/crypto.Dockerfile', 'scripts/reproducible-release.ts'] as const;
const HashFile = z.strictObject({ path: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/) });
const Component = z.strictObject({ type: z.literal('library'), name: z.string().min(1), version: z.string().min(1) });
const Sbom = z.strictObject({ bomFormat: z.literal('CycloneDX'), specVersion: z.literal('1.6'), version: z.literal(1),
  metadata: z.strictObject({ timestamp: z.iso.datetime(), component: z.strictObject({ type: z.literal('application'), name: z.literal('openvote'), version: z.string().min(1) }) }),
  components: z.array(Component).min(1) });
const Provenance = z.strictObject({
  format: z.literal('openvote-build-provenance-v1'),
  source: z.strictObject({ repository: z.literal('https://github.com/Lontkovsky/openvote'), commit: z.string().regex(/^[0-9a-f]{40}$/),
    committedAt: z.iso.datetime(), beleniosCommit: z.string().regex(/^[0-9a-f]{40}$/) }),
  builder: z.strictObject({ platform: z.string().min(1), arch: z.string().min(1), node: z.string().min(1), pnpm: z.string().min(1),
    vite: z.string().min(1), cryptoImage: z.literal(cryptoImage), cryptoImageId: z.string().regex(/^sha256:[0-9a-f]{64}$/) }),
  build: z.strictObject({ freshSourceDirectories: z.literal(2), freshDependencyDirectories: z.literal(2),
    comparison: z.literal('ByteIdentical'), excludedExecutableFiles: z.tuple([]) }),
  inputs: z.array(HashFile).min(1),
  artifacts: z.array(z.strictObject({ client: z.enum(['full', 'demand']), treeSha256: z.string().regex(/^[0-9a-f]{64}$/),
    manifestSha256: z.string().regex(/^[0-9a-f]{64}$/), files: z.number().int().positive() })).length(2),
});

function fail(code: string): never { throw new Error(code); }
function sha256(value: string | Buffer): string { return createHash('sha256').update(value).digest('hex'); }
function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

async function command(commandName: string, args: string[], cwd: string, capture = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const output: Buffer[] = [];
    let size = 0;
    const environment = { ...process.env, PATH: dirname(process.execPath) + ':' + process.env.PATH };
    const child = spawn(commandName, args, { cwd, env: environment, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
    if (capture && child.stdout !== null) child.stdout.on('data', chunk => {
      const value = Buffer.from(chunk);
      size += value.length;
      if (size > 32 * 1024 * 1024) child.kill('SIGTERM');
      else output.push(value);
    });
    child.once('error', () => reject(new Error('RELEASE_COMMAND_FAILED')));
    child.once('exit', code => code === 0 && size <= 32 * 1024 * 1024
      ? resolve(Buffer.concat(output).toString('utf8'))
      : reject(new Error('RELEASE_COMMAND_FAILED')));
  });
}

async function files(root: string, directory = root): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(root, path));
    else if (entry.isFile()) output.push(path);
    else return fail('RELEASE_ARTIFACT_TYPE_INVALID');
  }
  return output.sort((left, right) => compare(relative(root, left), relative(root, right)));
}

async function inputHashes(root: string, paths: string[]) {
  return Promise.all(paths.toSorted().map(async path => HashFile.parse({ path, sha256: sha256(await readFile(join(root, path))) })));
}

async function copySources(repository: string, destination: string): Promise<string[]> {
  const listed = await command('git', ['ls-files', '-z', '--', ...sourcePaths], repository, true);
  const paths = listed.split('\0').filter(Boolean).sort(compare);
  if (paths.length === 0) return fail('RELEASE_SOURCE_INPUTS_MISSING');
  for (const path of paths) {
    await mkdir(dirname(join(destination, path)), { recursive: true, mode: 0o755 });
    await copyFile(join(repository, path), join(destination, path));
  }
  return paths;
}

async function extractCrypto(repository: string, destination: string) {
  await mkdir(destination, { recursive: true, mode: 0o755 });
  const imageId = (await command('docker', ['image', 'inspect', cryptoImage, '--format', '{{.Id}}'], repository, true)).trim();
  if (!/^sha256:[0-9a-f]{64}$/.test(imageId)) return fail('CRYPTO_IMAGE_INVALID');
  const container = (await command('docker', ['create', cryptoImage], repository, true)).trim();
  if (!/^[0-9a-f]{64}$/.test(container)) return fail('CRYPTO_CONTAINER_INVALID');
  try {
    for (const file of cryptoFiles) await command('docker', ['cp', `${container}:/opt/belenios/${file}`, join(destination, file)], repository);
  } finally { await command('docker', ['rm', '-f', container], repository); }
  return imageId;
}

async function clientManifest(root: string, client: 'full' | 'demand', sourceCommit: string): Promise<ClientReleaseManifestType> {
  const entrypoint = client === 'full' ? 'index.html' : 'demand.html';
  const artifactFiles = await files(root);
  const releaseFiles = await Promise.all(artifactFiles.map(async path => {
    const artifact = relative(root, path), body = await readFile(path);
    return { path: artifact === entrypoint ? '/' : '/' + artifact, artifact, bytes: body.length, sha256: sha256(body) };
  }));
  releaseFiles.sort((left, right) => compare(left.path, right.path));
  const tree = createHash('sha256');
  for (const file of releaseFiles.toSorted((left, right) => compare(left.artifact, right.artifact))) {
    tree.update(file.artifact).update('\0').update(await readFile(join(root, file.artifact))).update('\0');
  }
  return ClientReleaseManifest.parse({ format: 'openvote-client-release-v1', client, sourceCommit,
    treeSha256: tree.digest('hex'), files: releaseFiles });
}

async function build(repository: string, root: string, cryptoRoot: string, sourceCommit: string, pnpmExecutable: string) {
  const sourceFiles = await copySources(repository, root);
  await mkdir(join(root, 'apps/web/public'), { recursive: true, mode: 0o755 });
  await cp(cryptoRoot, join(root, 'apps/web/public/crypto'), { recursive: true, errorOnExist: true, force: false });
  await command(process.execPath, [pnpmExecutable, 'install', '--frozen-lockfile'], root);
  await command(process.execPath, [pnpmExecutable, '--filter', '@openvote/web', 'build'], root);
  await command(process.execPath, [pnpmExecutable, '--filter', '@openvote/web', 'build:demand'], root);
  return {
    sourceFiles,
    full: await clientManifest(join(root, 'apps/web/dist'), 'full', sourceCommit),
    demand: await clientManifest(join(root, 'apps/web/dist-demand'), 'demand', sourceCommit),
  };
}

function dependencyComponents(input: unknown) {
  const packages = new Map<string, z.infer<typeof Component>>();
  const visit = (record: unknown) => {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) return;
    for (const [name, value] of Object.entries(record)) {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) continue;
      const version = Reflect.get(value, 'version');
      if (typeof version === 'string') packages.set(name + '@' + version, Component.parse({ type: 'library', name, version }));
      visit(Reflect.get(value, 'dependencies'));
      visit(Reflect.get(value, 'devDependencies'));
      visit(Reflect.get(value, 'optionalDependencies'));
    }
  };
  const workspaces = z.array(z.object({ dependencies: z.unknown().optional(), devDependencies: z.unknown().optional(), optionalDependencies: z.unknown().optional() })).parse(input);
  for (const workspace of workspaces) {
    visit(workspace.dependencies); visit(workspace.devDependencies); visit(workspace.optionalDependencies);
  }
  packages.set('belenios@3.3.0', Component.parse({ type: 'library', name: 'belenios', version: '3.3.0' }));
  packages.set('libsodium@1.0.21', Component.parse({ type: 'library', name: 'libsodium', version: '1.0.21' }));
  return [...packages.values()].sort((left, right) => compare(left.name, right.name) || compare(left.version, right.version));
}

async function writeJson(path: string, value: unknown) {
  const content = JSON.stringify(value, null, 2) + '\n';
  await writeFile(path, content, { mode: 0o644, flag: 'wx' });
  return sha256(content);
}

async function main() {
  const [output] = z.tuple([z.string().min(1)]).parse(process.argv.slice(2));
  const repository = process.cwd(), pnpmExecutable = z.string().min(1).parse(process.env.npm_execpath);
  if ((await command('git', ['status', '--porcelain', '--untracked-files=no'], repository, true)).trim() !== '') return fail('RELEASE_SOURCE_DIRTY');
  const sourceCommit = (await command('git', ['rev-parse', 'HEAD'], repository, true)).trim();
  const committedAt = new Date((await command('git', ['show', '-s', '--format=%cI', 'HEAD'], repository, true)).trim()).toISOString();
  const treeEntry = (await command('git', ['ls-tree', 'HEAD', 'vendor/belenios'], repository, true)).trim().split(/\s+/);
  const beleniosCommit = treeEntry[2];
  if (!/^[0-9a-f]{40}$/.test(sourceCommit) || !/^[0-9a-f]{40}$/.test(beleniosCommit ?? '')) return fail('RELEASE_SOURCE_INVALID');
  const packageDocument = z.object({ version: z.string().min(1) }).parse(JSON.parse(await readFile('package.json', 'utf8')));
  const webPackage = z.object({ devDependencies: z.object({ vite: z.string().min(1) }) }).parse(JSON.parse(await readFile('apps/web/package.json', 'utf8')));
  const workspace = await mkdtemp(join(tmpdir(), 'openvote-release-'));
  const cryptoRoot = join(workspace, 'crypto'), firstRoot = join(workspace, 'first'), secondRoot = join(workspace, 'second');
  let outputCreated = false;
  try {
    const cryptoImageId = await extractCrypto(repository, cryptoRoot);
    const first = await build(repository, firstRoot, cryptoRoot, sourceCommit, pnpmExecutable);
    const second = await build(repository, secondRoot, cryptoRoot, sourceCommit, pnpmExecutable);
    if (JSON.stringify(first.full) !== JSON.stringify(second.full) || JSON.stringify(first.demand) !== JSON.stringify(second.demand)) {
      return fail('REPRODUCIBLE_BUILD_MISMATCH');
    }
    const dependencyTree = JSON.parse(await command(process.execPath,
      [pnpmExecutable, 'list', '--recursive', '--json', '--depth', 'Infinity'], firstRoot, true));
    const pnpmVersion = (await command(process.execPath, [pnpmExecutable, '--version'], firstRoot, true)).trim();
    const sourceInputs = await inputHashes(repository, first.sourceFiles);
    const cryptoInputs = (await inputHashes(cryptoRoot, [...cryptoFiles])).map(file => ({ ...file, path: 'crypto/' + file.path }));

    await mkdir(dirname(output), { recursive: true, mode: 0o755 });
    await mkdir(output, { mode: 0o755 });
    outputCreated = true;
    await cp(join(firstRoot, 'apps/web/dist'), join(output, 'full'), { recursive: true, errorOnExist: true, force: false });
    await cp(join(firstRoot, 'apps/web/dist-demand'), join(output, 'demand'), { recursive: true, errorOnExist: true, force: false });
    const fullManifestHash = await writeJson(join(output, 'full-client-manifest.json'), first.full);
    const demandManifestHash = await writeJson(join(output, 'demand-client-manifest.json'), first.demand);
    const sbom = Sbom.parse({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
      metadata: { timestamp: committedAt, component: { type: 'application', name: 'openvote', version: packageDocument.version } },
      components: dependencyComponents(dependencyTree) });
    await writeJson(join(output, 'sbom.cdx.json'), sbom);
    const provenance = Provenance.parse({ format: 'openvote-build-provenance-v1',
      source: { repository: 'https://github.com/Lontkovsky/openvote', commit: sourceCommit, committedAt, beleniosCommit },
      builder: { platform: process.platform, arch: process.arch, node: process.version, pnpm: pnpmVersion,
        vite: webPackage.devDependencies.vite, cryptoImage, cryptoImageId },
      build: { freshSourceDirectories: 2, freshDependencyDirectories: 2, comparison: 'ByteIdentical', excludedExecutableFiles: [] },
      inputs: [...sourceInputs, ...cryptoInputs].sort((left, right) => compare(left.path, right.path)),
      artifacts: [
        { client: 'full', treeSha256: first.full.treeSha256, manifestSha256: fullManifestHash, files: first.full.files.length },
        { client: 'demand', treeSha256: first.demand.treeSha256, manifestSha256: demandManifestHash, files: first.demand.files.length },
      ] });
    await writeJson(join(output, 'provenance.json'), provenance);
    const checksumFiles = await files(output);
    const checksums = await Promise.all(checksumFiles.map(async path => `${sha256(await readFile(path))}  ${relative(output, path)}`));
    await writeFile(join(output, 'SHA256SUMS'), checksums.join('\n') + '\n', { mode: 0o644, flag: 'wx' });
    console.log(JSON.stringify({ status: 'ReproducibleReleaseVerified', sourceCommit,
      full: { files: first.full.files.length, treeSha256: first.full.treeSha256 },
      demand: { files: first.demand.files.length, treeSha256: first.demand.treeSha256 }, output }));
  } catch (error) {
    if (outputCreated) await rm(output, { recursive: true, force: true });
    throw error;
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

await main().catch(error => {
  console.error(error instanceof Error && /^[A-Z][A-Z0-9_]{1,100}$/.test(error.message) ? error.message : 'RELEASE_VERIFICATION_FAILED');
  process.exitCode = 1;
});
