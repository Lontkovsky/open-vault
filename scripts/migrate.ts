import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { database, readConfig, sha, transaction } from '../apps/api/src/common.ts';

export async function migrateAll(runtimeRoot = '.runtime'): Promise<void> {
  for (const role of ['identity', 'ballot', 'management']) {
    const pool = database(await readConfig(role, runtimeRoot));
    try {
      await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL)');
      for (const name of (await readdir(`migrations/${role}`)).sort()) {
        const sql = await readFile(`migrations/${role}/${name}`, 'utf8');
        await transaction(pool, async client => {
          await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE');
          const prior = await client.query<{ checksum: string }>('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
          if (prior.rows.length) {
            if (prior.rows[0]?.checksum !== sha(sql)) throw new Error('Migration changed after application');
          } else {
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations VALUES($1,$2)', [name, sha(sql)]);
          }
        });
      }
    } finally { await pool.end(); }
    console.log(role + ': migrations verified');
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) await migrateAll();
