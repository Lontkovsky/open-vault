# Minimal demand-validation deployment

Issue [#53](https://github.com/Lontkovsky/openvote/issues/53) owns the initial public launch. The single [`render.yaml`](../render.yaml) declares one `openvote` web service, four databases and one 1 GB persistent disk in one `production` environment. The service currently runs only the demand application; the disk is reserved for the future full runtime.

## Declared resources and cost boundary

The active demand configuration contains:

- one Docker web service, `openvote`, on plan `0.5c-512mb`;
- one PostgreSQL 18 database, `openvote-demand`, on plan `0.1c-256mb` with 1 GB storage;
- the apex custom domain `openvote.com.ua`;
- no demand data on the attached disk, wildcard domain, API subdomains, identity service, ballot service, management service or cryptographic runtime in the running container.

The expected steady base is approximately USD 14.45 per month: USD 13.30 for the active web service and demand database, USD 0.25 for the persistent disk, and USD 0.90 for 1 GB storage on each of the three suspended role databases. This is not a billing cap. Bandwidth, build-minute, tax or other usage-based charges can be additional. The Render review screen is authoritative immediately before deployment.

The owner approved creating the unified resources. Render suspension is an operational action rather than a Blueprint field: after creation, suspend the identity, ballot and management databases and leave only `openvote` plus `openvote-demand` active. Suspended database storage remains billable.

## Product and data boundary

The launch serves one Ukrainian landing page and one versioned demand poll. It does not expose the full catalogue, user-created polls, identity verification, Belenios, trustees or the formal closing/publication workflow of the full platform. The landing publicly shows the total number of accepted responses and the exact count for each established answer, including zeros. It must not claim that a response represents a unique person, a Ukrainian citizen or the population of Ukraine.

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

In the retained in-app Browser session, open the local demand page and verify the three answers, explicit final confirmation, successful receipt, reload persistence, absence of editable controls after submission, the zero state, exact public counts before and after submission, equality of the total with the three-count sum, and a 390×844 layout without horizontal overflow. Keep this local evidence separate from the hosted checks below.

## Unified full-stack environment

The same environment also declares the three role databases from issue [#51](https://github.com/Lontkovsky/openvote/issues/51). During demand collection they remain suspended. The full Docker runtime is not active and the attached disk remains uninitialized in this phase.

The future full-platform cutover reuses the same `openvote` service and disk: switch the Dockerfile/environment variables and compute plan, resume the three role databases, add the wildcard domain, and suspend `openvote-demand`. Do not start the full runtime without the attached persistent key state.

## Paid deployment and DNS

After local checks, retained in-app Browser verification, pull-request CI and merge, sync the single Blueprint in the existing Render project, verify the demand service and all four databases, and suspend the three unused role databases.

DNS remains unchanged until Render creates the approved service and displays its actual custom-domain target. At that point:

1. Export the current Ukraine.com.ua zone.
2. Preserve mail and every unrelated record.
3. Replace only the approved apex record with the exact Render value.
4. Verify apex HTTPS and TLS in the retained in-app Browser session.

The DNS replacement is a separate destructive action and requires confirmation immediately before it is performed. Do not guess Render targets or verification records.

## Hosted verification still required

Local and CI success do not prove the public deployment. After an approved deployment, verify the landing and one synthetic response over `https://openvote.com.ua`, perform an actual Render service restart, reload the same browser session and confirm that the final recorded state persists. Until those checks pass, issue #53 remains open and no hosted-completion claim is valid.
