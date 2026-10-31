# Landing design QA

## Evidence

- Source visual truth: `/Users/slontkovskyi/Developer/PERSONAL/openVote/.runtime/design-qa/source-hero.jpg`, `source-about.jpg`, and `source-privacy.jpg`, captured from deployed-layout commit `33042ef83209a290cc1df6ee450ee15405a0eb94`.
- Implementation: `http://localhost:5174/#top` on branch `feature/landing-hero-poll`.
- Implementation screenshots: `/Users/slontkovskyi/Developer/PERSONAL/openVote/.runtime/design-qa/implementation-hero-goal.jpg`, `implementation-about.jpg`, and `implementation-demo-privacy.jpg`.
- Combined comparison: `/Users/slontkovskyi/Developer/PERSONAL/openVote/.runtime/design-qa/comparison-desktop-goal.jpg` (source on the left, implementation on the right).
- Responsive evidence: `/Users/slontkovskyi/Developer/PERSONAL/openVote/.runtime/design-qa/implementation-hero-1280x720.jpg` and `implementation-hero-goal-mobile.jpg`.
- Comparison viewport: `1121 × 954` CSS px. Source and implementation captures are both `1106 × 941` px from the same in-app Browser transport. No density normalization was required.
- State: page top, initial poll, no selected answer, zero local responses.

## Full-view comparison

The current page preserves the first deployed version's pale hero, large human-language headline, dark right-hand card, three-card purpose section, and privacy treatment. The following differences are intentional and explicitly requested: the service strip and multi-link navigation are removed; OpenVote branding and the existing logo are used; the tagline is `Чесно. Прозоро. Анонімно.`; the real poll replaces the descriptive launch card; the compact 10,000-support launch goal sits below the lead; the header is fixed; the desktop hero fills one viewport; and the existing walkthrough video sits between the purpose and privacy sections.

Typography retains the established display/body hierarchy without clipping. Spacing keeps the two-column desktop composition and responsive single-column mobile flow. Colors continue the existing indigo, white, and cool-gray palette. The repository SVG logo, video, and poster are reused without substitutes. Copy is coherent in the standalone page and contains none of the removed service labels.

## Focused-region comparison

- `comparison-hero-goal.jpg`: confirms brand, headline, launch-goal callout, poll card, first-screen balance, disabled state, radii, contrast, and shadow treatment.
- `comparison-about.jpg`: confirms the original heading hierarchy, three equal cards, numbering, spacing, and copy density.
- `comparison-lower.jpg`: confirms the existing video/poster, three walkthrough steps, and restored privacy block.

No additional crop was required because these three focused comparisons keep the relevant typography, logo, controls, and media readable at native resolution.

## Findings

No actionable P0, P1, or P2 visual or interaction findings remain.

## Comparison history

1. P2 layout: at `1280 × 720`, the first implementation measured `741.89` px high instead of one viewport. The desktop hero rule was tightened while preserving the complete poll. Post-fix measurement is exactly `720` px; the poll remains fully visible from `107.05` to `687.94` px.
2. P2 content: the first privacy draft contained a technical claim about IP address and response-time storage that exceeded the verified page contract. It was replaced with direct human-language copy limited to the information the form does not request or associate with the answer.
3. P2 information order: the first draft placed privacy before the walkthrough. The final order is hero and poll, platform purpose, walkthrough, then privacy, matching the agreed marketing flow.
4. Launch-goal iteration: the new textual goal was placed in the left hero column instead of the already dense poll card. At `1280 × 720` the hero remains exactly `720` px and both columns remain fully visible. At `390 × 844` the callout is `337.5` px wide with no horizontal overflow.

## Interaction and responsive verification

- The fixed header and single CTA remain visible; the CTA lands the poll below the header (`poll top 91.94` px, header bottom `72` px on mobile).
- The form starts with three radios and a disabled submit button. Selecting an answer reveals confirmation; confirmation enables submit; changing the answer clears confirmation and disables submit again.
- One synthetic local response produced the receipt and `1/0/0` counts, persisted after reload, and was then removed with an exact local-row cleanup. The final state is `0/0/0` with the form available.
- The launch goal uses only the authoritative `Підтримую` count. Browser states `0`, `37` with four unrelated answers, `9,999`, `10,000`, and `10,001` confirmed the remaining count, exact threshold, reached message, and absence of negative values. The `1/0/0` submission updated the goal to `1` and `9,999` remaining and persisted after reload.
- The video starts paused, is muted, has native controls and no autoplay, advances on play, and pauses successfully.
- At `390 × 844`, the fixed header, tagline, CTA, form, and video remain usable with no horizontal overflow.
- The FAQ follows the privacy section with nine native disclosures, all closed on initial load. Mouse activation opened the first answer; keyboard `Space` closed it and `Enter` opened the final answer. The answer about result integrity was left open for review.
- At the default desktop viewport the FAQ rendered within `clientWidth = scrollWidth = 1265`. At the explicit `390 × 844` mobile viewport the long database-access question wrapped cleanly, the answer remained readable, the fixed header and CTA stayed visible, and `clientWidth = scrollWidth = 375` after accounting for the vertical scrollbar.
- The unchanged poll still exposed one header CTA and three radio answers; submit remained disabled before a choice and confirmation. The CTA reached `#poll` with the poll at `92.05` px, below the `76.25` px fixed header. No response was submitted during the FAQ verification.
- The rejected inline AI form is absent. The page starts with one floating chat launcher and no open panel; opening it renders the focused compact dialog with the title `Тарас` and a short greeting, without a subtitle or service note.
- A real question appeared as a user bubble immediately, followed by `Тарас друкує…` and the actual grounded answer. The composer cleared and re-enabled after success. Closing returned focus to the launcher; reopening preserved the conversation.
- At `390 × 844`, the open panel measured `355 × 520` px, the composer remained visible, the 54 px launcher stayed within the viewport, and `clientWidth = scrollWidth = 375`. The public page contained no provider brand or service note.
- In-app Browser console errors and warnings checked: none.

final result: passed
