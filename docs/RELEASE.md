# Development release candidate

Status: no public OpenVote release exists yet. This document defines the single release path for the synthetic development candidate. It does not authorize a production launch or a deployment.

## Release boundary

The candidate contains the full synthetic OpenVote application, the demand landing, the unmodified Belenios 3.3.0 reference cryptography, public verification tools and public test evidence. It supports only the declared `TEST-PERSON` fixtures and separately generated test trustee keys.

The candidate is not approved for real politically sensitive participation. Production identity-provider contracts, the legal operator and policies, independent cryptographic/security/privacy review, and independent trustees/governance remain the separate open Production Readiness issues [V026–V029](https://github.com/Lontkovsky/openvote/issues/37).

## Verification checklist

| Case | Prerequisite | Expected result | Current evidence |
|---|---|---|---|
| Clean checkout | Recursive clone, Node 24.20.0, pnpm 10.33.0, Docker and Python 3 | Locked install, bootstrap and migrations complete without private material in Git | Implemented; final clean-checkout repetition pending |
| Documented commands | Local synthetic services and the exact inputs documented below | `bootstrap`, `dev`, `seed`, `test`, `test:e2e`, `verify`, `audit:export` and `smoke` follow their documented contracts | Passed locally: 103/103 tests, 27/27 native checks, Browser 14/14 stages and 38/38 assertions, native archive verification and current-poll audit export; exact-head CI pending |
| Full browser journey | Existing retained in-app Browser and healthy local services | Create, review, three choices, duplicate rejection, close, tally, exports and provider failure/recovery all pass | Passed in run `6c9fa7afdf` with identical initial/final source hash |
| Negative and adversarial cases | Synthetic fixtures only | Declared rejections and detections in A01–A11 retain evidence | Complete local suite passed 103/103; exact-head CI pending |
| Reproducible clients | Clean committed source and pinned crypto image | Two fresh full and demand builds are byte-identical; manifests, checksums, SBOM and provenance are generated | Passed locally on commit `591e51e56a57777d32bd6758f6cb4fadcadf9dc9`; exact-head CI pending |
| Public evidence hygiene | Candidate source and generated public artifacts | No known credential/private-key pattern, private trustee material or real identity is published | Pre-evidence scan passed; final post-evidence scan pending |
| Public RC | All implementable rows above passed on the exact PR head and required CI is green | One GitHub prerelease points to the merged exact commit and links the remaining open Production Readiness work | Not published |

No row becomes complete from documentation alone. The issue, board and final report must link the actual run, exact commit, PR and CI result.

## Exact local verification path

From a recursive clean checkout, build the pinned reference image, install the locked workspace and initialize the isolated synthetic services:

```sh
docker build --platform linux/amd64 --target crypto-runtime -f infra/crypto.Dockerfile -t openvote-crypto:3.3.0 .
pnpm install --frozen-lockfile
pnpm bootstrap
pnpm dev
```

Keep `pnpm dev` running. In another terminal, exercise the documented non-browser entrypoints:

```sh
pnpm smoke
pnpm seed
pnpm test
pnpm types
pnpm build
pnpm build:demand
pnpm release:verify .runtime/release
```

Run `pnpm test:e2e` once and complete every stage through the existing in-app Browser exactly as described in [BROWSER_TESTING.md](BROWSER_TESTING.md). Then independently verify the archive downloaded by that Browser:

```sh
pnpm verify artifacts/e2e/election.bel
```

The `audit:export` command requires the exact pretrusted observer configuration described in [OBSERVER.md](OBSERVER.md). Its successful local contract is recorded there with the actual retained synthetic configuration and exclusive output path; the focused observer suite reproduces both successful export and rejected evidence cases.

Finally run the bounded public scan and inspect the diff:

```sh
python3 scripts/scan-public.py
git diff --check
```

## Public candidate contents

The GitHub source archive supplies the exact reviewed source. Required CI attaches two public evidence artifacts:

- `release-public-evidence`: full and demand clients, strict manifests, `SHA256SUMS`, CycloneDX SBOM and build provenance;
- `reference-public-evidence`: the public Belenios archive and reference verification report.

The source archive also contains the final retained-Browser report and public exports under `artifacts/e2e`, the observer evidence under `artifacts/observer`, the bounded load report and the A01–A11 registry. Database dumps, runtime configuration, identity sessions, private credentials, trustee secrets, receipt collections and `.runtime` never belong in a public release.

## Publication gate

Publish exactly one GitHub prerelease only after the final integrated Browser report is committed, the implementation PR is approved for merge, required CI is successful on that exact head, the merged commit is known, and the public-artifact scan is repeated. The release notes must link this checklist, the exact commit and CI run, and must list V026–V029 as open external prerequisites.

Deployment is a separate owner-approved action. Creating or merging a candidate must not be reported as a hosted rollout, and the current homepage change must not be deployed before the owner's visual confirmation.
