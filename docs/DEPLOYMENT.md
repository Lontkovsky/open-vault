# Future full Render synthetic demo deployment

Issue [#51](https://github.com/Lontkovsky/openvote/issues/51) owns this future vertical slice. Its Blueprint is preserved at [`infra/render.full.yaml`](../infra/render.full.yaml); the repository default now points to the smaller demand-validation launch in [#53](https://github.com/Lontkovsky/openvote/issues/53). Selecting this full Blueprint would deploy a public **synthetic demo** at `openvote.com.ua`; it does not complete the Production Readiness epic.

## Declared resources

`infra/render.full.yaml` creates the `Open Vote` project and `demo` environment in Frankfurt:

- one Docker web service, `openvote-demo`, on plan `1c-2g`;
- three PostgreSQL 18 databases on plan `0.1c-256mb`, one each for identity, ballot and management;
- one 1 GB persistent disk mounted at `/app/.runtime-disk`; OpenVote owns only its deterministic `state` subdirectory and exposes it to the existing runtime paths through the image's fixed `/app/.runtime` symlink;
- the apex and wildcard custom-domain entries.

The Dashboard review observed on 2026-10-30 totals USD 44.15/month before VAT and usage overages: USD 25 for compute, USD 18.90 for three databases and USD 0.25 for the disk. Render's Dashboard review is the authoritative charge and requires owner confirmation before `Deploy Blueprint`.

## Runtime and trust boundaries

Nginx is the only process bound to `0.0.0.0:$PORT`. It routes by exact host rather than collapsing browser origins:

| Host | Internal destination |
|---|---|
| `openvote.com.ua` | built SPA only |
| `identity.openvote.com.ua` | `127.0.0.1:4301` |
| `ballot.openvote.com.ua` | `127.0.0.1:4302` |
| `management.openvote.com.ua` | `127.0.0.1:4303` |

Unknown hosts return HTTP 421. Providers A/B and both Belenios transports remain loopback-only. Browser CORS accepts exactly `https://openvote.com.ua`; requests without `Origin` remain available to the authenticated internal service calls. Identity, ballot and management use different databases and role credentials. The identity session is never sent to the ballot host.

This separation does not create independent operators: one Render service, disk and account remain under one owner. It is a development deployment boundary, not evidence of organizational independence, production anonymity or external review.

## Startup contract

The startup process has one fail-closed path:

1. Validate `demo`, the exact public origin, Render `$PORT` and all three private database URLs.
2. If no runtime marker exists, require an empty OpenVote state subdirectory and three databases with no application tables. Provider-owned mount entries outside that subdirectory, such as `lost+found`, are never treated as application state.
3. Generate separate role tokens/keys/configuration once with private file permissions.
4. Apply repository migrations to all three databases.
5. Write the ready marker only after migrations succeed.
6. On every later start, verify the marker, file permissions, cross-role bindings, exact database credentials and existing migration tables before applying any newer migration.
7. Start both crypto bridges, then five application roles, then Nginx. A child exit terminates the service.

A missing marker with any disk content, a nonempty database with an empty disk, a changed database binding, a missing migration table or an origin mismatch stops startup. There is no key regeneration or alternate workflow over existing state.

## Custom domain and DNS

The Blueprint declares `openvote.com.ua` and `*.openvote.com.ua`. After Render creates the service, use only the actual targets shown in its Custom Domains panel:

1. Export the existing Ukraine.com.ua DNS zone before replacing records.
2. Preserve MX, SPF TXT, `mail` and every unrelated record.
3. Replace the parked apex destination with Render's actual apex target.
4. Point wildcard `*` to the actual service `.onrender.com` hostname.
5. Add Render's exact `_acme-challenge` and `_cf-custom-hostname` verification CNAME records for the wildcard certificate.
6. Return to Render and verify both domain entries.

Do not guess the service or verification hostnames. Replacing the existing apex/`www` records is a destructive DNS action and requires confirmation immediately before it is performed. The required post-change checks are apex HTTPS, HTTP-to-HTTPS redirect, `www` redirect to apex, each exact API host, and rejection of an unknown wildcard host.

## Verification and rollback boundary

Before merge, verify the focused origin/runtime tests, final image build, Nginx host-routing fixture, affected service/native tests, the complete retained in-app Browser flow and exact-head CI. After deployment, repeat the synthetic Browser flow through HTTPS and verify an accepted ballot and runtime/key hashes survive an actual Render service restart.

Render can redeploy a prior application image, but database migrations and persistent runtime state are not automatically rolled back. Never delete or replace the disk to roll back code. No verified backup/restore procedure exists yet, so this deployment does not satisfy the production backup/restore acceptance criteria. A recovery exercise must prove that accepted ballots remain present and that restored state cannot reopen a right to vote before production readiness can advance.
