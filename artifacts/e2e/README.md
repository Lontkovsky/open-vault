# Browser evidence status

`report.json` records current run `7f67776650`: all 14 stages / 38 assertions passed with coordinator exit 0. Initial and final source digest are both `34bc4ab66289391cd8b03775b5c1004e97a90f2ff8d40d70df088e6aa5e1425c`; the run finished at 2026-10-30T14:21:45.028Z. The retained existing in-app Browser tab exercised the full synthetic voting, export and provider-recovery flow.

The adjacent result JSON/CSV/SVG and native archive all belong to that run (native election `FuUyTkqdp3Z4rY`). Each export was obtained through its real UI control after arming the existing Browser download event; no production download code or alternate browser was used. `verification.json` records separate Belenios 3.3.0 verification of the downloaded archive: three ballots, closed status and `[[1,1,1]]`.

This is local development evidence, not external review or production readiness. PR #48 still requires successful CI on its final pushed head. Independently retained acknowledgement history, key-holder collusion and the complete privacy leak/reconstruction matrix remain open.
