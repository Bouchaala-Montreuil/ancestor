# Evidence identifier verification — 2026-10-26

Method: every record in `js/data/evidence.js` was checked against **two independent
registries** — the NCBI PubMed E-utilities API and the Crossref REST API — using
`tools/verify_evidence.js`. A record is marked verified only when **both** agree on
the DOI.

---

## Result

| | |
|---|---|
| Records | 14 |
| Published sources | 12 |
| **Verified (PubMed + Crossref agree)** | **12 / 12** |
| Carrying a PMID | 12 / 12 |
| Records permitted to drive recommendations | 7 |
| Internal notes (not published sources) | 2 |
| Unresolvable citations | **0** |

Every published record reports `[PubMed+Crossref]` — both registries returned the
same DOI.

---

## Verified records

| Record | DOI (confirmed) | PMID | Journal | Year |
|---|---|---|---|---|
| schoenfeld-2016-volume | `10.1080/02640414.2016.1210197` | 27433992 | J Sports Sci | 2017 |
| schoenfeld-2017-load | `10.1519/jsc.0000000000002200` | 28834797 | J Strength Cond Res | 2017 |
| morton-2018-protein | `10.1136/bjsports-2017-097608` | 28698222 | Br J Sports Med | 2018 |
| acsm-2009-progression | `10.1249/mss.0b013e3181915670` | 19204579 | Med Sci Sports Exerc | 2009 |
| damas-2018-hypertrophy | `10.1007/s00421-017-3792-9` | 29282529 | Eur J Appl Physiol | 2018 |
| wackerhage-2019-stimuli | `10.1152/japplphysiol.00685.2018` | 30335577 | J Appl Physiol | 2019 |
| garber-2011-quantity | `10.1249/mss.0b013e318213fefb` | 21694556 | Med Sci Sports Exerc | 2011 |
| watson-2015-sleep | `10.5665/sleep.4716` | 26039963 | Sleep | 2015 |
| aragon-2013-timing | `10.1186/1550-2783-10-5` | 23360586 | J Int Soc Sports Nutr | 2013 |
| phillips-2011-protein | `10.1080/02640414.2011.619204` | 22150425 | J Sports Sci | 2011 |
| ioannidis-2005 | `10.1371/journal.pmed.0020124` | 16060722 | PLoS Med | 2005 |
| suchomel-2016 | `10.1007/s40279-016-0486-0` | 26838985 | Sports Med | 2016 |

---

## Errors the verification caught and fixed

1. **`wackerhage-2019-stimuli` — wrong DOI.** Recorded as `…00738.2018`; both
   registries give **`…00685.2018`**. Corrected.

2. **`phillips-2011-protein` — wrong title.** Recorded as "Dietary protein
   requirements and adaptive advantages in athletes"; the indexed title is
   **"Dietary protein for athletes: from requirements to optimum adaptation."**
   The DOI was right; the title was not.

3. **`damas-2016-hypertrophy` — wrong journal, year *and* authors.**
   I had *Sports Medicine*, 2016, "Damas F, Phillips S, Vechin FC, Ugrinowitsch C".
   PubMed could not find it; **Crossref did**. The real paper is
   **Damas F, Libardi CA, Ugrinowitsch C — Eur J Appl Physiol 2018;118(3):485–500,
   DOI 10.1007/s00421-017-3792-9, PMID 29282529.** All four fields corrected.

This third case is the argument for a second registry: PubMed alone would have
left the record at draft, and the error would have survived.

---

## Records that cannot be verified by design

| Record | Why |
|---|---|
| `spot-reduction-statement` | Internal position note, not a published source. `draft` status, `very-low` quality — the review gate excludes it from driving rules. |
| `recovery-model-note` | Internal description of the app's own estimation model. Not a scientific source, and labelled as such wherever recovery figures appear. |

---

## Effect on the review gate

The gate requires `reviewed` status **and** `high`/`moderate` quality before a
record may affect a user-facing rule. Result:

- 7 records may drive recommendations (all verified, reviewed, moderate-or-high).
- Verified-but-low-quality records (damas, wackerhage, aragon, phillips, suchomel)
  are cited for context in lessons, but cannot drive rules — by design.
- The two internal notes cannot drive rules.

---

## Remaining caveats

- **Neither registry is the publisher.** PubMed and Crossref agreeing is strong
  evidence, but it is not the publisher's own record. For formal citation, verify
  against the publisher.
- **Crossref is rate-limited** from this environment; it returned HTTP 429 on
  earlier attempts before succeeding. Re-running elsewhere may behave differently.
- **Coverage is still partial.** The library covers topics ANCESTOR already uses;
  it is not a systematic review of the literature.
- **Findings text is a summary, not a quotation.** Each summary reflects the
  published conclusions as understood at `lastReviewed`; read it against the source.

---

## Re-running the check

```bash
node tools/verify_evidence.js            # report only
node tools/verify_evidence.js --apply    # write verified identifiers back
```

Results are written to `tools/evidence_verification.json`.
Requires network access to `eutils.ncbi.nlm.nih.gov` and `api.crossref.org`.
