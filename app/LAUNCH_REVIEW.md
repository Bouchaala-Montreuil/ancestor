# Launch review handoff — 31 October 2026

**Status: not approved for public launch.** The automated work below was run by
the development agent. It is not a review or approval by a clinician, exercise
professional, translator, accessibility specialist, security assessor or lawyer.
No physical devices, real assistive technology, Firefox, Safari or WebKit were
available for this pass. Do not substitute the results below for those reviews.
Use disposable test data; avoid recording real health data in screenshots.

## What was actually checked

- `npm run verify`: 1,981 headless checks, 1,946 static translation keys across
  seven languages, packaging/notices/vendor checks, build, and 67 site checks.
- `npm run test:browser`: 733 automated Chromium checks across its suites,
  including 176 layout combinations, keyboard flows, durability, a conservative
  hero-contrast bound and the axe matrix. Chromium was headless Linux, version
  153.0.8010.0; emulated viewport widths are not physical devices.
- The separate Playwright journey passed 72 checks in Chromium across an HTTP
  PWA and the actual `file://` standalone: onboarding, keyboard dialog, Arabic
  RTL, paper theme, 320–1280 px layouts, a workout, reload, export, invalid
  import and offline reload. **Firefox and WebKit have not been run.**
- Axe 4.14.0 reported zero automated violations across 144 states each on HTTP
  and standalone, with negative controls. This is not a WCAG conformance claim:
  The latest HTTP run had **1,138 contrast-node occurrences in 127 states** and
  standalone had **1,123 in 126 states** marked incomplete. Each had **112
  label-name occurrences in 28 states** marked incomplete, including the `?`
  metric-help controls. These occurrences can repeat the same node across states
  and counts varied slightly between runs. They need manual evaluation;
  incomplete does not mean passed.
- The hero test bounds six headers over the brightest possible image using the
  shipped scrim, text colors and conservative grain assumptions. Its minimum
  bound was 5.82:1 in dark and 5.97:1 in paper. It does **not** resolve the
  other axe contrast incompletes. Keyboard and pointer activation now reveal
  metric explanations, but their label-in-name/speech-control usability still
  needs human review.
- HTTP / standalone targeted suites respectively passed durability 96 / 95,
  workout safety 60 / 60, movement 38 / 38, exercise filters 54 / 54, release
  integrity 20 / 20, keyboard 74 / 74, rest timer 75 / 75 and hero contrast
  14 / 14. Normal-motion keyboard passed 74; Chromium installability and AX-tree
  audits passed 30 and 75. A simulated v45 → v46 PWA upgrade and offline reload
  retained a test record and mirror (8 checks). AX-tree inspection is not an
  actual screen reader.
- Both locked npm dependency audits reported zero known advisories on this date.
  Notices and the vendored bundle matched their canonical sources. This does
  not assess the browser binary, all runtime code/assets, or licensing, and is
  not a penetration test or security certification.
- Spot-checking two primary sources corrected a Wackerhage DOI link and removed
  an inaccurate per-week growth figure from the Schoenfeld volume summary. A
  lesson's broken Damas reference was repaired; a volume diagram now explicitly
  labels its synthetic curves as illustrative. See
  [Schoenfeld et al.](https://pubmed.ncbi.nlm.nih.gov/27433992/) and the
  [Wackerhage publisher record](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00685.2018).
  These spot-checks are **not** a comprehensive scientific review.

## Known product and review questions

- The onboarding answers for **usual sleep hours** and **sleep variability**
  are saved and shown in the profile but currently do not affect recovery or
  the train/rest decision. Only separately logged recent sleep does. Usual wake
  time is used as a day/scheduling anchor. The default sleep-hour slider value is
  not evidence that the person actually provided that answer. Decide whether to
  remove the unused questions or use an explicitly supplied baseline as a
  clearly identified, lower-confidence fallback; do not manufacture sleep logs
  or present the baseline as a measurement. No change to that behavior is
  claimed in this pass.
- Static dictionary-key coverage does not mean every generated sentence is
  translated or clinically reviewed. For example, some explanations in
  `js/engine/progression.js` and time/shift fragments in
  `js/engine/readiness.js` are hard-coded in English. Test actual workouts and
  states in all seven languages, not only dictionary presence.
- Cross-tab checks are best-effort, not atomic compare-and-swap or a merge
  service. IndexedDB and localStorage are on the same origin and can both be
  evicted or cleared. Export excludes an active draft; an initiated download is
  not proof it was saved. Erasure can fail and does not delete downloads or
  copies on other devices. Storage is not presented as encrypted.
- Recovery windows, readiness and progression logic are heuristics, not a
  measurement or a medical assessment. Exercise filters express preferences and
  limitations but are not comprehensive contraindication screening. A stop
  recommendation can be acknowledged and overridden. Their clinical and
  exercise suitability remains to be reviewed.

## Required independent reviews before launch

### Devices, browsers and accessibility

- [ ] Test current Android Chrome with TalkBack and current iOS Safari with
  VoiceOver on physical phones; record device, OS, browser and AT versions.
- [ ] Test macOS Safari/VoiceOver and Windows Firefox and Chromium with NVDA or
  another supported screen reader. Headless WebKit on Linux would not be Safari.
- [ ] Walk the complete first-use, five-tab navigation, 3D and flat anatomy,
  all dialogs, metric help, workout, timer, settings, export, import, erase,
  recovery and error states with keyboard, touch and screen-reader gestures.
  Check focus, reading order, names, selected/expanded state, modal isolation,
  live announcements and voice-control label matching.
- [ ] Review the incomplete axe results, graphical contrast and all six heroes
  visually in both themes. Test 200% and 400% zoom, text scaling, high contrast,
  reduced motion, Arabic RTL, screen rotation and small touch targets. Exercise
  the volume diagram and its illustrative label in each language.
- [ ] Install, update and reload offline, then test storage denial/eviction,
  private browsing, network interruption and multiple tabs on real devices.
  Confirm whether exports really save and imports work on each platform.

A pinned **inactive template** is at `tools/ci/browser-engines.yml`. To run the
Playwright Chromium/Firefox/WebKit matrix on GitHub Actions, an authorized
maintainer must grant the Arena GitHub connection Workflows permission, place the
template under `.github/workflows/`, and run the workflow. The app's current
GitHub connection could not create or update workflow files. Passing that
headless matrix would still not replace physical Safari or screen-reader tests.

### Exercise and clinical review

- [ ] A qualified strength and conditioning professional reviews all 88
  guides, including exercise-specific setup, range, return/hold/stride cues,
  equipment and assisted/weighted variants, failure/spotter guidance,
  substitutions, bodyweight/timed/distance progression and accessible options.
- [ ] A qualified clinician reviews symptom and pain language, stop/override
  paths, limitations, contraindications, escalation guidance and the intended
  audience. Check that users are not encouraged to train through symptoms.
- [ ] Together review the usual-sleep question, recovery multipliers, available
  sleep evidence, uncertainty, freshness and the effects of missing information.
  Do not treat heuristic estimates as validated individual physiology.

### Translation and science

- [ ] Native speakers and exercise/clinical terminology reviewers check all
  user-facing content in English, French, Spanish, German, Italian, Dutch and
  Arabic, including instructions, warnings, on-screen numbers, generated
  explanations, right-to-left layout and screen-reader pronunciation.
- [ ] An independent domain expert checks every evidence record against the
  primary source, its metadata, sample, limitations and dates, and checks every
  lesson, diagram, recommendation, model assumption and claimed citation link.
  Internal `reviewStatus`/identifier flags are not expert sign-off.
- [ ] Evaluate newer research and applicability rather than treating a single
  pooled study or illustrative curve as an individual prediction.

### Security, privacy and legal

- [ ] Independently assess input/import handling, CSP, origin boundaries,
  storage/backup/erase failures, service-worker upgrades, dependencies and the
  build/distribution process. Exercise malicious records in a real browser.
- [ ] Counsel reviews privacy disclosures, health-related claims, applicable
  consumer/accessibility law, licence compatibility, copyright/provenance of
  every asset, and distribution obligations (including the CC BY-SA anatomy
  mesh, derived figure and the proprietary app licence).
- [ ] A release owner collects review records, fixes and retests findings on the
  exact release artifact before approving distribution.

## Review record (to be completed by actual reviewers)

| Area | Reviewer and qualification | Device/version or scope | Findings / evidence | Date / decision |
|---|---|---|---|---|
| Exercise | | | | |
| Clinical | | | | |
| Translation, each locale | | | | |
| Science | | | | |
| Accessibility / AT | | | | |
| Real devices and browsers | | | | |
| Security and privacy | | | | |
| Legal / licensing | | | | |
| Release owner | | | | |
