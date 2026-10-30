# Browser evidence status

`report.json` records current run `dadf885395`: all 14 stages / 38 assertions passed with coordinator exit 0. Initial and final source digest are both `76bed0c44392e0ed7492e539bc76460162d992462765a6e5aa3b54328472a0df`; the run finished at 2026-10-30T14:46:38.931Z. The retained existing in-app Browser tab exercised the full synthetic voting, export and provider-recovery flow on the `main`-integrated PR #49 source.

The adjacent result JSON/CSV/SVG and native archive all belong to that run (native election `eFPiFRESkrpukk`). Each export was obtained through its real UI control after arming the existing Browser download event; no production download code or alternate browser was used. `verification.json` records separate Belenios 3.3.0 verification of the downloaded archive: three ballots, closed status and `[[1,1,1]]`.

This is local development evidence, not external review or production readiness. PR #49 merge is gated by successful CI on its final pushed evidence head. Independently trusted roster provenance, retained acknowledgement history, role/key-holder collusion, recovery/backup controls and the complete privacy leak/reconstruction matrix remain open.
