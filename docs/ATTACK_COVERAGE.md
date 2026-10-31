# Покриття початкового стрес-тесту

Machine-readable source: [attack-coverage.json](attack-coverage.json). Defense outcome and evidence state are independent. This is an incomplete implementation checkpoint, not an assertion that all subcases of an attack are covered. No ExternallyReviewed evidence exists.

| ID | Scenario | Defense outcome | Evidence state | Remaining work / risk |
|---|---|---|---|---|
| A01 | Повторні голоси однієї людини | PartiallyMitigated | AutomatedTested | Stale writable backup guard not yet implemented |
| A02 | Фіктивні голоси від власника або issuer | PartiallyMitigated | AutomatedTested | Genuine foreign credentials, an eligible post-open nonmember and frozen API roster/key changes are rejected; replacing the trusted roster admits an issuer-created credential. Independent roster provenance and complete role/collusion evidence remain open |
| A03 | Встановлення вибору конкретної людини | PartiallyMitigated | AutomatedTested | Native subset/individual/early/small-group guards tested; first signed fork needs external acknowledgement evidence; issuer linkage, sufficient key collusion and unanimity remain limitations |
| A04 | Компрометація БД, логів і backups | PartiallyMitigated | AutomatedTested | Runtime disk/DB mismatch and byte-identical restart are tested; full leak/reconstruction and verified backup/restore remain pending |
| A05 | Добровільне голосування видається за думку населення | PartiallyMitigated | AutomatedTested | UI/API/JSON/CSV/SVG consistency tested; the simplified demand landing retains explicit self-selection and non-representativeness limits; external copies, screenshots and spreadsheet reinterpretation cannot be controlled |
| A06 | Маніпуляція формулюванням і контекстом | PartiallyMitigated | AutomatedTested | Five required rubric decisions, reasoned duplicate rejection, author appeal, moderator-only resolution and immutable opened context are tested. External model behavior, the broader malicious-language suite and source/content removal policy remain open |
| A07 | Дублікати та захоплення каталогу | PartiallyMitigated | AutomatedTested | Concurrent paraphrased drafts share one cross-provider author cap; daily publication, cooldown and simultaneous-open limits return distinct failures. An operator with source or database control can still bypass application quotas |
| A08 | Цензура та суперечливі історії | PartiallyMitigated | AutomatedTested | Observer detects known-history rollback, receipt loss, substitution and compared forks; lawful tombstones/read-only restoration remain open; isolated forks need evidence exchange |
| A09 | Підміна збірки та непрозоре управління | PartiallyMitigated | NotTested | Two-clean-build comparison, independent client monitor and release locking pending |
| A10 | Недоступність провайдера ідентифікації | PartiallyMitigated | AutomatedTested | Synthetic A/B, expiry races and bounded UI recovery tested; production adapters and real upstream independence await contracts |
| A11 | Купівля голосів і примус | KnownLimitation | NotTested | Belenios integration provides neither receipt-freeness nor coercion resistance; explicit limitation experiments pending |

Each record identifies trust boundaries, implementation, issues, tests and remaining acceptance criteria. KnownLimitation does not waive implementable controls. The current tests do not yet constitute the full A01–A11 adversarial suite.
