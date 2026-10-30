# Minimal demand-validation deployment

Issue [#53](https://github.com/Lontkovsky/openvote/issues/53) owns the initial public launch. The default [`render.yaml`](../render.yaml) declares only the demand-validation landing and its database. It does not deploy the full Open Vote platform.

## Declared resources and cost boundary

The minimal Blueprint declares one Frankfurt environment with:

- one Docker web service, `openvote-launch`, on plan `0.5c-512mb`;
- one PostgreSQL 18 database, `openvote-demand`, on plan `0.1c-256mb` with 1 GB storage;
- the apex custom domain `openvote.com.ua`;
- no persistent service disk, wildcard domain, API subdomains, identity service, ballot service, management service or cryptographic runtime.

The expected Dashboard base is USD 13.30 per month: USD 7 for the web service and the currently displayed USD 6.30 for the database. This is not a billing cap. Bandwidth, build-minute, tax or other usage-based charges can be additional. The Render review screen is authoritative immediately before deployment.

No paid resource may be created until the owner confirms the exact Dashboard total. This repository change prepares and validates configuration only.

## Product and data boundary

The launch serves one Ukrainian landing page and one versioned demand poll. It does not expose the full catalogue, user-created polls, identity verification, Belenios, trustees or live public results. It must not claim that a response represents a unique person, a Ukrainian citizen or the population of Ukraine.

The browser credential is a host-only HttpOnly SameSite=Strict cookie with a one-year maximum age and the Secure flag on HTTPS. Each response row contains only the poll ID and version, the credential hash and the final selected answer; it has no identity, contact, IP address, User-Agent or response timestamp field. The public page must disclose voluntary self-selection, the lack of identity and citizenship verification, the browser-cookie limitation, and the absence of one-person-one-vote guarantees.

## Local verification before approval

Run the affected checks with the repository-pinned Node and pnpm versions:

```sh
pnpm test tests/demand.test.ts tests/render-start.test.ts tests/transport.test.ts
pnpm types
pnpm build
pnpm build:demand
pnpm migrate
pnpm smoke
pnpm lint
pnpm audit --prod
render blueprints validate render.yaml --output json
docker build --platform linux/amd64 -f infra/demand.Dockerfile -t openvote-demand:local .
```

In the retained in-app Browser session, open the local demand page and verify the three answers, explicit final confirmation, successful receipt, reload persistence, absence of editable controls after submission, absence of public counts, and a 390×844 layout without horizontal overflow. Keep this local evidence separate from the hosted checks below.

## Preserved future configuration

The complete synthetic-demo Blueprint from issue [#51](https://github.com/Lontkovsky/openvote/issues/51) remains unchanged at [`infra/render.full.yaml`](../infra/render.full.yaml). It still describes the three databases, persistent runtime disk, cryptographic runtime and separate API hosts. It is a future configuration and must not be selected for the initial launch.

If that future deployment is approved, create a separate Render Blueprint and set its Blueprint Path explicitly to `infra/render.full.yaml`. The repository default remains the minimal launch to prevent accidental provisioning of the full stack.

## Deferred paid deployment and DNS

After local checks, retained in-app Browser verification, pull-request CI and merge, the next action is to open the minimal Blueprint review in the existing Render session. Stop at the final cost screen and obtain explicit owner confirmation before selecting Deploy Blueprint.

DNS remains unchanged until Render creates the approved service and displays its actual custom-domain target. At that point:

1. Export the current Ukraine.com.ua zone.
2. Preserve mail and every unrelated record.
3. Replace only the approved apex record with the exact Render value.
4. Verify apex HTTPS and TLS in the retained in-app Browser session.

The DNS replacement is a separate destructive action and requires confirmation immediately before it is performed. Do not guess Render targets or verification records.

## Hosted verification still required

Local and CI success do not prove the public deployment. After an approved deployment, verify the landing and one synthetic response over `https://openvote.com.ua`, perform an actual Render service restart, reload the same browser session and confirm that the final recorded state persists. Until those checks pass, issue #53 remains open and no hosted-completion claim is valid.
