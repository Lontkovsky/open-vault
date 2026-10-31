import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { Answers, ResultContract, percentage, policyText } from '../packages/domain/src/index.ts';
import { AuditPackage, ObserverConfig } from '../packages/domain/src/observer.ts';
import { observePublic } from './observer-client.ts';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function page(input: unknown) {
  const result = ResultContract.parse(input);
  const rows = Answers.map((answer, index) => {
    const count = result.counts[index];
    if (count === undefined) throw new Error('RESULT_COUNT_MISSING');
    return `<tr><th scope="row">${escapeHtml(answer)}</th><td>${count}</td><td>${percentage(count, result.acceptedVotes)}%</td></tr>`;
  }).join('');
  return `<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(result.question)} — OpenVote</title><style>
:root{font-family:system-ui,sans-serif;color:#171923;background:#f7f7fb}body{margin:0}main{max-width:760px;margin:auto;padding:48px 24px}article{background:#fff;border:1px solid #d9d9e3;border-radius:18px;padding:32px}h1{font-size:clamp(1.8rem,5vw,3rem);line-height:1.08;margin:0 0 24px}.meta{color:#555b70;line-height:1.6}table{width:100%;border-collapse:collapse;margin:28px 0}th,td{text-align:left;padding:14px 8px;border-bottom:1px solid #e4e4ec}td{text-align:right}.notice{padding:16px;border-left:4px solid #5f55d6;background:#f1f0ff;line-height:1.5}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}a{color:#3d34a5;font-weight:700}
</style></head><body><main><article><p><strong>OpenVote · перевірений публічний результат</strong></p><h1>${escapeHtml(result.question)}</h1>
<p class="meta">Допуск: ${escapeHtml(policyText(result.policy))}<br>Голосування: <time datetime="${escapeHtml(result.opensAt)}">${escapeHtml(result.opensAt)}</time> — <time datetime="${escapeHtml(result.closesAt)}">${escapeHtml(result.closesAt)}</time><br>Статус: опубліковано · перевірено референсним протоколом</p>
<table><caption>Прийнято голосів: ${result.acceptedVotes}</caption><thead><tr><th>Відповідь</th><th>Голоси</th><th>Частка</th></tr></thead><tbody>${rows}</tbody></table>
<p class="notice">${escapeHtml(result.representativenessWarning)}</p><nav class="links" aria-label="Файли перевірки"><a href="result.json" download>Результат JSON</a><a href="audit.json" download>Audit package</a></nav>
</article></main></body></html>\n`;
}

async function writeExclusive(path: string, value: string) {
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(value); await file.sync(); } finally { await file.close(); }
}

async function main() {
  const [configFile, outputDirectory] = z.tuple([z.string().min(1), z.string().min(1)]).parse(process.argv.slice(2));
  await mkdir(outputDirectory, { mode: 0o700 });
  let complete = false;
  try {
    const config = ObserverConfig.parse(JSON.parse(await readFile(configFile, 'utf8')));
    const { observation, audit: input } = await observePublic(config, null);
    if (input === null || observation.verification !== 'ReferenceVerified') throw new Error('MIRROR_NOT_PUBLISHABLE');
    const audit = AuditPackage.parse(input), result = ResultContract.parse(audit.result);
    await writeExclusive(join(outputDirectory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    await writeExclusive(join(outputDirectory, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
    await writeExclusive(join(outputDirectory, 'index.html'), page(result));
    const directory = await open(outputDirectory, 'r');
    try { await directory.sync(); } finally { await directory.close(); }
    complete = true;
    console.log(JSON.stringify({ pollId: config.trust.pollId, status: 'ReadOnlyMirrorExported', archiveHash: observation.publishedArchiveHash }));
  } finally {
    if (!complete) await rm(outputDirectory, { recursive: true, force: true });
  }
}

try { await main(); }
catch (error) {
  const code = error instanceof Error && /^[A-Z][A-Z0-9_]{1,100}$/.test(error.message) ? error.message : 'READ_ONLY_MIRROR_EXPORT_FAILED';
  console.error(code); process.exitCode = 1;
}
