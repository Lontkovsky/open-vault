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

## Deployed resources and DNS

The approved Blueprint is deployed in the `Open Vote` project as one `openvote` web service. `openvote-demand` is active; `openvote-identity`, `openvote-ballot` and `openvote-management` are suspended. The 1 GB disk is attached at `/app/.runtime-disk` but the demand application does not use it.

The Ukraine.com.ua zone was exported before the approved DNS change. The apex uses Render's `216.24.57.1`; `www` is a CNAME to `openvote-launch.onrender.com.` because Render service slugs are immutable even after a display-name change. Mail, SPF and the unrelated wildcard record remain unchanged. Render serves a valid certificate for the apex and redirects `https://www.openvote.com.ua/` to the canonical apex over HTTPS.

## Hosted verification evidence

PR #57 exact-head CI passed and merged as `33042ef83209a290cc1df6ee450ee15405a0eb94`; the exact `main` workflow also passed. Render deploy `dep-dbifsjqvcj2c73fan370` reached `live`. In the retained in-app Browser, the apex displayed two accepted responses as `Підтримую 2`, `Не підтримую 0`, `Утримуюсь 0`, with the representativeness warning and no console warnings/errors. The same values remained readable without horizontal overflow at 390×844.

An actual Render restart made both the page and API temporarily return 502, then recover to 200. Reloading the same retained Browser tab after recovery showed the same `2/0/0` aggregate, proving that the two existing production rows survived the restart. No additional production response was submitted for verification.

## Action-first landing and synthetic walkthrough

Issue [#59](https://github.com/Lontkovsky/openvote/issues/59) and [PR #60](https://github.com/Lontkovsky/openvote/pull/60) are a presentation-only follow-up to the verified launch in #53. They keep the exact demand API, database, cookie and aggregate contracts, but move the confirmed question and vote action ahead of product explanation. The page retains one concise visible notice that participation is voluntary, identity and citizenship are not checked, another browser can respond again, and the counts are not unique people or the opinion of Ukrainians generally.

The separate `Як працюватиме платформа` section uses one repository-owned, silent H.264 MP4 with a local poster and native controls. Its three frames were captured in the retained in-app Browser from the existing local synthetic interface at source revision `18869231e2728da393cb4c6c63eb5dec98b195ba`: a populated create form, a selected final vote before submission, and a Published `1/1/1` result. The asset contains no identity selection, credential, key, production response, browser storage, console, local path, narration or third-party media. It is explicitly labeled as a synthetic prototype whose interface may change.

Focused verification for this follow-up is:

- inspect the source frames and encoded asset; use `ffprobe` to confirm H.264, 1280×720, 30 fps, limited-range `yuv420p`, no audio and bounded size;
- run the demand contract test, types, both web builds, lint/public scan and demand Docker image build;
- in the retained in-app Browser, verify the first viewport, anchor, three answers, explicit confirmation, local submission and reload, exact aggregate sum, one paused video, play/pause/seek, keyboard focus and 390×844 layout;
- after exact-head CI and merge, verify the same page and media over HTTPS without submitting a production response, and record the unchanged live aggregate separately.

PR #60 exact-head workflow `41130447936` passed and the PR merged as `130b03c2c12127dfa209af0296da173307b03b7a`. The standard `Deploy latest commit` action created Render deploy `dep-dbigolek1f9s73d59n30` for that exact commit after no automatic deploy appeared during the observed post-merge interval; it reached `live` in 1m34s. The retained in-app Browser verified the apex over HTTPS without submitting a response: the live aggregate was `30 = 26/0/4`, the form still had exactly three unselected answers and a disabled submit action, the same-origin video began paused and passed keyboard play/pause, the console was clean, and the 390×844 layout had no horizontal overflow. The hosted MP4 returned `video/mp4`, `Accept-Ranges: bytes`, HSTS and a correct `206` byte-range response.
