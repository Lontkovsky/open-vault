# OpenVote

Незалежна відкрита платформа добровільних голосувань із підтвердженням права участі та можливістю незалежно перевірити результати.

**Development work in progress. This repository is not a completed release.** Only explicitly synthetic identities and test ballots are in scope. It is not a state service, official election, binding referendum or representative survey. Real politically sensitive participation is not enabled.

Requirements: [product and engineering contract](docs/REQUIREMENTS.md), [mandatory adversarial controls](docs/REQUIREMENTS-A15.md).

Implementation and verification status: [progress](docs/PROGRESS.md). Architecture choices: [decisions](docs/DECISIONS.md).

The first implemented slice runs **unmodified Belenios 3.3.0 cryptography** with five synthetic participants, a 2-of-3 threshold **plus a mandatory trustee**, final-vote enforcement and offline public verification. The web application is still under development. The fixed roster does not support adding a genuinely new person after opening; see [protocol compatibility](docs/adr/0001-reference-core.md).

The application slice now includes synthetic identity providers A/B, separate PostgreSQL stores, client encryption, final ballot acceptance, trustee finality checks, public results and a Ukrainian React interface. It is still **incomplete development work**, with remaining acceptance criteria recorded in [progress](docs/PROGRESS.md).

## Minimal demand-validation launch

Issue [#53](https://github.com/Lontkovsky/openvote/issues/53) owns the first public surface at `openvote.com.ua`: one Ukrainian landing page and one voluntary demand poll. Follow-up issue [#59](https://github.com/Lontkovsky/openvote/issues/59) makes the poll the immediate primary action and adds one silent same-origin walkthrough assembled from the existing synthetic create, vote and published-result screens. Issue [#62](https://github.com/Lontkovsky/openvote/issues/62) adopts the single `OpenVote` brand, one persistent poll CTA and concise nontechnical poll messaging. The walkthrough contains no real identities or production response data and is not a production-readiness claim. The single [Render Blueprint](render.yaml) declares one `openvote` web service and four databases in one `production` environment. During demand collection the service uses only `openvote-demand`; the identity, ballot and management databases remain suspended. Each response row contains only the poll ID and version, a hash of a random browser credential, and the final selected answer; it does not contain identity, contact, network or response-time fields. The landing publishes only the total number of accepted responses and the exact count for each of the three answers.

This poll is not identity-verified voting or a representative survey. Clearing site data or using another browser permits another response, so it cannot establish one-person-one-vote or the opinion of Ukrainians generally. The exact cost, privacy and approval boundaries are documented in [minimal deployment operations](docs/DEMAND_DEPLOYMENT.md).

The same web service has one 1 GB persistent disk reserved for the future full-platform work in [#51](https://github.com/Lontkovsky/openvote/issues/51); demand responses remain exclusively in `openvote-demand`. The future cutover will suspend that database, resume the three role databases and switch the service to the Belenios runtime, which will initialize and reuse the attached disk for runtime keys and state. Full-platform hosted verification remains deferred; [the full deployment contract](docs/DEPLOYMENT.md) remains distinct from the verified demand launch.

For the local application, install Node **24.20.0**, pnpm **10.33.0**, Docker Compose and Python 3, then run from the cloned repository:

```sh
pnpm install --frozen-lockfile
pnpm bootstrap
pnpm dev
```

In another terminal:

```sh
pnpm smoke
pnpm seed
pnpm test
pnpm types
pnpm build
```

Open [the local application](http://localhost:5173). `seed` creates one immutable seven-day synthetic poll and is idempotent. Select a predefined `TEST-PERSON` identity; never supply real documents. Person 0012 is the test moderator. Other fixtures include a non-owner, a minor and a non-UA citizen to exercise explicit eligibility rules. Session refresh requires re-identification; it never resets voting rights. Generated credentials and trustee files are private, ignored `.runtime/` data. Do not publish that directory.

To inspect the separate demand landing locally while the full platform remains available, run `pnpm dev:demand` and open [http://localhost:5174](http://localhost:5174). It reuses the local management PostgreSQL instance only as a development database; the Render Blueprint provisions one dedicated `openvote_demand` database.

The integration tests use live local services and native cryptography. They remove only the poll fixtures they created. Interactive browser checks reuse the existing in-app Browser and are separate from the CLI tests. Follow [the E2E procedure](docs/BROWSER_TESTING.md) to run `pnpm test:e2e` with the existing tab binding. Current final-source run `dadf885395` passed all 14 stages / 38 assertions, including real JSON/CSV/SVG/audit downloads and separate native verification of the downloaded archive. [Browser evidence status](artifacts/e2e/README.md) records the exact source digest and bounded result. Complete offline-ballot/error coverage and final release instructions remain open.

[Resource limits and the measured local load profile](docs/LOAD_TEST.md) document exact request-body, active-work, queue and timeout bounds plus the actual hardware, two-poll dataset and 1,000-request result. The local read result is not a national-scale or production-capacity claim.

<a id="verification"></a>

Verify the archive downloaded by the browser without identity storage:

```sh
pnpm verify artifacts/e2e/election.bel
```

The separate [public observer](docs/OBSERVER.md) persists signed history, checks a published native tally and compares independent observations for conflicting histories. Its `observer`, `audit:export`, `mirror:export` and `recovery:verify` commands require an explicitly trusted poll/key configuration. The one-shot mirror export produces only a static result page plus the verified JSON result and audit package; it has no identity connection or writable endpoint. Recovery verification compares a restored view with separately retained observation/receipt evidence before write traffic is allowed under the documented [recovery procedure](docs/RECOVERY.md). These commands never initialize missing history implicitly or use an identity session. The reproducible observer tests run with `pnpm exec vitest run tests/observer.test.ts` against the committed browser audit. Split-view detection requires observers to exchange incompatible evidence; it is not guaranteed while they remain isolated.

[Trustee verification](docs/TRUSTEE_VERIFICATION.md) documents native proof validation before share storage, final-set binding, real zero/one/two-ballot suppression tests and the limits of a first signed history or an unanimous result. The adapter calls the original Belenios library; it does not implement voting cryptographic primitives.

[Admission verification](docs/ADMISSION_VERIFICATION.md) covers genuine foreign credentials, replay across polls/environments/context/keys, immutable API registration and the distinct limitation of a replaced trusted roster. All identities and key material in those scenarios are synthetic.

To reproduce the current slice with Git, Docker and Python 3:

```sh
git clone --recurse-submodules https://github.com/Lontkovsky/openvote.git
cd openvote
docker build --platform linux/amd64 --target crypto-runtime -f infra/crypto.Dockerfile -t openvote-crypto:3.3.0 .
sh scripts/test-reference.sh
sh scripts/verify.sh artifacts/reference/election.bel
python3 scripts/scan-public.py
```

Verification runs with Docker networking disabled and only the public archive mounted. Generated private material stays inside temporary container directories and is removed with the container. The exported `.bel` file contains ciphertexts and reference proofs, not named choices. `artifacts/reference/reference-report.json` records exactly which checks ran; this command does not test browser encryption or prove production security.

Public planning: [issues](https://github.com/Lontkovsky/openvote/issues), [board](https://github.com/users/Lontkovsky/projects/5). `python3 scripts/sync-backlog.py` and `python3 scripts/sync-board.py` reconcile the declared backlog through an already authenticated `gh` CLI without printing tokens. Execution status remains on GitHub.

Own code is licensed **AGPL-3.0-only**. Third-party components retain their own licenses.
