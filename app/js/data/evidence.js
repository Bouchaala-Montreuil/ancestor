/* ============================================================================
   ANCESTOR — evidence library

   A maintained, clearly-dated library of structured evidence records. No
   citation is hardcoded into a screen: lessons and recommendation rules
   reference records by id, so a source is updated in exactly one place.

   HONESTY ABOUT THIS LIBRARY
   --------------------------
   `identifierVerified` states whether the DOI/PMID was checked against the
   publisher record. Where it is false, the bibliographic details must be
   confirmed before publication. Findings summaries reflect the published
   conclusions as understood at `lastReviewed`; they are summaries, not
   quotations, and should be read against the source.

   Live literature retrieval is NOT available in this build. This is a
   curated offline snapshot with declared coverage limits.
   ========================================================================== */

const EVIDENCE = [
    {
      "id": "schoenfeld-2016-volume",
      "title": "Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis",
      "authors": "Schoenfeld BJ, Ogborn D, Krieger JW",
      "year": 2016,
      "journal": "Journal of Sports Sciences",
      "type": "meta-analysis",
      "doi": "10.1080/02640414.2016.1210197",
      "url": "https://doi.org/10.1080/02640414.2016.1210197",
      "population": "Healthy adults in resistance-training interventions",
      "question": "Does weekly resistance-training volume change the magnitude of muscle-mass gain?",
      "findings": "A graded dose-response was observed: higher weekly set volumes per muscle group were associated with greater hypertrophy on average, roughly 0.37% per week with <5 sets versus about 0.78% per week with 10+ sets. Effects averaged across studies; individual responses varied widely.",
      "limitations": "Observational dose-response across trials rather than within-trial randomisation of volume; imprecise volume measures; mostly short-to-medium studies; far fewer data on trained individuals and on very high volumes.",
      "relevance": "Supports tracking weekly sets per muscle group and flagging large volume changes for review, rather than assuming one fixed volume is optimal for everyone.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "muscle-growth",
        "training-principles"
      ],
      "rules": [
        "volume.tracking",
        "prog.increase"
      ],
      "pmid": "27433992"
    },
    {
      "id": "schoenfeld-2017-load",
      "title": "Strength and hypertrophy adaptations between low- versus high-load resistance training: a systematic review and meta-analysis",
      "authors": "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW",
      "year": 2017,
      "journal": "Journal of Strength and Conditioning Research",
      "type": "meta-analysis",
      "doi": "10.1519/jsc.0000000000002200",
      "pmid": "28834797",
      "url": "https://doi.org/10.1519/JSC.0000000000002200",
      "population": "Adults in supervised resistance-training trials",
      "question": "Do lighter and heavier loads produce different strength and hypertrophy outcomes?",
      "findings": "Hypertrophy was broadly similar between low and high loads when sets were taken near failure. Heavier loads produced larger increases in maximal-strength measures. Load choice therefore interacts with the outcome being targeted.",
      "limitations": "Strength testing often matched to the training load; failure definitions varied; untrained participants predominated.",
      "relevance": "Explains why rep ranges follow the selected goal, and why strength goals bias towards lower reps and heavier loads.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "strength-power",
        "muscle-growth"
      ],
      "rules": [
        "goal.repRange"
      ]
    },
    {
      "id": "morton-2018-protein",
      "title": "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength",
      "authors": "Morton RW, Murphy KT, McKellar SR, et al.",
      "year": 2018,
      "journal": "British Journal of Sports Medicine",
      "type": "meta-analysis",
      "doi": "10.1136/bjsports-2017-097608",
      "url": "https://doi.org/10.1136/bjsports-2017-097608",
      "population": "Adults undertaking resistance training",
      "question": "Does protein supplementation improve strength and hypertrophy, and does it depend on dose, age or training status?",
      "findings": "Protein supplementation produced a modest benefit for lean-mass and strength gains, attenuating with age and with higher baseline intakes. Benefit plateaued around roughly 1.6 g/kg/day of total protein for most people.",
      "limitations": "Self-reported diet; supplementation confounded with total intake; heterogeneous measures.",
      "relevance": "Nutrition lessons cite intake patterns as general education only. ANCESTOR does not measure intake and does not compute nutrition targets from user data.",
      "quality": "high",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "nutrition",
        "muscle-growth"
      ],
      "rules": [],
      "pmid": "28698222"
    },
    {
      "id": "acsm-2009-progression",
      "title": "American College of Sports Medicine position stand: progression models in resistance training for healthy adults",
      "authors": "American College of Sports Medicine (Kraemer WJ, Ratamess NA, et al.)",
      "year": 2009,
      "journal": "Medicine & Science in Sports & Exercise",
      "type": "position-stand",
      "doi": "10.1249/mss.0b013e3181915670",
      "url": "https://doi.org/10.1249/MSS.0b013e3181915670",
      "population": "Healthy adults",
      "question": "How should resistance training be progressed?",
      "findings": "Supports systematic variation of load, volume and exercise selection over time, with planned progression rather than random or purely maximal loading. Emphasises individualisation and recovery.",
      "limitations": "Consensus/position document rather than a single trial; recommendations are principles to be adapted, not prescriptions.",
      "relevance": "The basis for ANCESTOR treating progression as an earned, rule-based step rather than a calendar-based increase.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "training-principles",
        "strength-power"
      ],
      "rules": [
        "prog.increase",
        "prog.hold",
        "prog.deload"
      ],
      "pmid": "19204579"
    },
    {
      "id": "damas-2018-hypertrophy",
      "title": "The development of skeletal muscle hypertrophy through resistance training: the role of muscle damage and muscle protein synthesis",
      "authors": "Damas F, Libardi CA, Ugrinowitsch C",
      "year": 2018,
      "journal": "European Journal of Applied Physiology",
      "type": "narrative-review",
      "doi": "10.1007/s00421-017-3792-9",
      "url": "https://doi.org/10.1007/s00421-017-3792-9",
      "population": "Adults undertaking resistance training",
      "question": "What drives resistance-training induced hypertrophy?",
      "findings": "Describes early hypertrophy contributions from damage/oedema versus later cumulative myofibrillar accretion, and the role of repeated muscle protein synthesis responses. Frames adaptation as a cumulative process rather than a single workout effect.",
      "limitations": "Narrative synthesis; mechanistic model partly inferred; not a prescriptive protocol study.",
      "relevance": "Used to explain why a single session does not produce measurable growth, and why trends are read over weeks.",
      "quality": "low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "Located and confirmed against both PubMed (PMID 29282529) and Crossref on 2026-10-26. Earlier versions of this record had the wrong journal, year and author list; all three were corrected.",
      "lessons": [
        "muscle-growth"
      ],
      "rules": [],
      "pmid": "29282529"
    },
    {
      "id": "wackerhage-2019-stimuli",
      "title": "Stimuli and sensors that initiate skeletal muscle hypertrophy following resistance exercise",
      "authors": "Wackerhage H, Schoenfeld BJ, Hamilton DL, Lehti M, Hulmi JJ",
      "year": 2019,
      "journal": "Journal of Applied Physiology",
      "type": "narrative-review",
      "doi": "10.1152/japplphysiol.00685.2018",
      "url": "https://doi.org/10.1152/japplphysiol.00738.2018",
      "population": "Human and mechanistic model literature",
      "question": "Which signals initiate hypertrophy after resistance exercise?",
      "findings": "Reviews mechanical tension as a central stimulus with metabolic and damage-related contributors, and stresses that the sensor mechanisms are still being resolved. Explicitly cautions against simplistic single-cause narratives.",
      "limitations": "Mechanistic review; translation to programme design is indirect.",
      "relevance": "Supports the lesson statement that \"the mechanism\" is a simplified educational model, not a settled single pathway.",
      "quality": "low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "muscle-growth"
      ],
      "rules": [],
      "pmid": "30335577"
    },
    {
      "id": "garber-2011-quantity",
      "title": "American College of Sports Medicine position stand: quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal and neuromotor fitness",
      "authors": "Garber CE, Blissmer B, Deschenes MR, et al.",
      "year": 2011,
      "journal": "Medicine & Science in Sports & Exercise",
      "type": "position-stand",
      "doi": "10.1249/mss.0b013e318213fefb",
      "pmid": "21694556",
      "url": "https://doi.org/10.1249/MSS.0b013e318213fefb",
      "population": "Apparently healthy adults",
      "question": "How much and what kind of exercise maintains fitness?",
      "findings": "Summarises dose ranges for cardiorespiratory, resistance, flexibility and neuromotor training, with attention to progression and individual capacity.",
      "limitations": "Position stand; general population framing; not individualised medical guidance.",
      "relevance": "Frames general-activity and mobility lessons and supports not defining fitness solely by lifting numbers.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "cardio-health",
        "aging-mobility"
      ],
      "rules": []
    },
    {
      "id": "watson-2015-sleep",
      "title": "Recommended amount of sleep for a healthy adult: a joint consensus statement of the American Academy of Sleep Medicine and Sleep Research Society",
      "authors": "Watson NF, Badr MS, Belenky G, et al.",
      "year": 2015,
      "journal": "Sleep",
      "type": "guideline",
      "doi": "10.5665/sleep.4716",
      "url": "https://doi.org/10.5665/sleep.4716",
      "population": "Healthy adults",
      "question": "How much sleep should adults obtain?",
      "findings": "Recommends 7 or more hours per night for healthy adults, noting individual variation and that short sleep is associated with adverse health outcomes.",
      "limitations": "Consensus; associations not all causal; does not address shift-work schedules in detail.",
      "relevance": "Used as the reference band for declared sleep. ANCESTOR treats sleep as user-reported context and never as a measured physiological signal.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "sleep-recovery"
      ],
      "rules": [
        "recovery.sleepBand"
      ],
      "pmid": "26039963"
    },
    {
      "id": "aragon-2013-timing",
      "title": "Nutrient timing revisited: is there a post-exercise anabolic window?",
      "authors": "Aragon AA, Schoenfeld BJ",
      "year": 2013,
      "journal": "Journal of the International Society of Sports Nutrition",
      "type": "narrative-review",
      "doi": "10.1186/1550-2783-10-5",
      "url": "https://doi.org/10.1186/1550-2783-10-5",
      "population": "Adults undertaking resistance training",
      "question": "Is there a narrow post-exercise window for nutrient intake?",
      "findings": "Argues the anabolic window is far wider than commonly claimed and that total daily intake matters more than precise timing for most people.",
      "limitations": "Narrative review; heterogeneous primary data.",
      "relevance": "Cited in the misconceptions lesson to counter over-precise timing claims.",
      "quality": "low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "nutrition",
        "misconceptions"
      ],
      "rules": [],
      "pmid": "23360586"
    },
    {
      "id": "phillips-2011-protein",
      "title": "Dietary protein for athletes: from requirements to optimum adaptation",
      "authors": "Phillips SM, Van Loon LJC",
      "year": 2011,
      "journal": "Journal of Sports Sciences",
      "type": "narrative-review",
      "doi": "10.1080/02640414.2011.619204",
      "pmid": "22150425",
      "url": "https://doi.org/10.1080/02640414.2011.619204",
      "population": "Athletes and active adults",
      "question": "How much protein do active people need?",
      "findings": "Reviews higher protein needs for training individuals than sedentary guidelines, with distribution across the day discussed.",
      "limitations": "Narrative review; estimates vary by method.",
      "relevance": "General nutrition education only — the app does not compute intake targets from user data.",
      "quality": "low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "nutrition"
      ],
      "rules": []
    },
    {
      "id": "ioannidis-2005",
      "title": "Why most published research findings are false",
      "authors": "Ioannidis JPA",
      "year": 2005,
      "journal": "PLoS Medicine",
      "type": "methods",
      "doi": "10.1371/journal.pmed.0020124",
      "url": "https://doi.org/10.1371/journal.pmed.0020124",
      "population": "Published biomedical research",
      "question": "How often are published research findings true?",
      "findings": "Argues that for many study designs and fields, the probability a reported finding is true can be low, driven by small samples, flexible analyses, bias and multiplicity.",
      "limitations": "Modelling paper with contested assumptions; not a direct statement about any single study.",
      "relevance": "Basis for the scientific-literacy lesson: a single study rarely justifies overturning a well-supported recommendation.",
      "quality": "moderate",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "scientific-literacy",
        "misconceptions"
      ],
      "rules": [
        "evidence.reviewGate"
      ],
      "pmid": "16060722"
    },
    {
      "id": "suchomel-2016",
      "title": "The importance of muscular strength in athletic performance",
      "authors": "Suchomel TJ, Nimphius S, Stone MH",
      "year": 2016,
      "journal": "Sports Medicine",
      "type": "narrative-review",
      "doi": "10.1007/s40279-016-0486-0",
      "url": "https://doi.org/10.1007/s40279-016-0486-0",
      "population": "Athletic populations",
      "question": "How does maximal strength relate to performance qualities?",
      "findings": "Reviews relationships between maximal strength and force-development qualities, with implications for training emphasis across a career.",
      "limitations": "Narrative; athletic populations; transfer to general populations is indirect.",
      "relevance": "Supports presenting strength as one trainable quality among several, not the only marker of progress.",
      "quality": "low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": true,
      "verificationNote": "DOI and PMID confirmed against both PubMed and Crossref on 2026-10-26.",
      "lessons": [
        "strength-power"
      ],
      "rules": [],
      "pmid": "26838985"
    },
    {
      "id": "spot-reduction-statement",
      "title": "Regional fat loss (\"spot reduction\"): ANCESTOR evidence note",
      "authors": "ANCESTOR evidence note",
      "year": 2026,
      "journal": "internal",
      "type": "position-statement",
      "doi": "",
      "url": "",
      "population": "General",
      "question": "Can exercise reduce fat in a specific body region?",
      "findings": "Evidence does not support exercising a muscle group to selectively reduce fat overlying it. Fat change occurs systemically over time, with regional variation determined by factors the app cannot assess.",
      "limitations": "Internal explanatory note, not a peer-reviewed source. Provided because the claim is common and the absence of support is itself important.",
      "relevance": "Used to explicitly refuse spot-reduction framing in the metabolism explorer.",
      "quality": "very-low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "draft",
      "identifierVerified": false,
      "verificationNote": "Internal explanatory note or model description — not a published source and not verifiable against an external registry.",
      "lessons": [
        "energy-fat",
        "misconceptions"
      ],
      "rules": []
    },
    {
      "id": "recovery-model-note",
      "title": "ANCESTOR recovery estimation: model description and limits",
      "authors": "ANCESTOR engine note",
      "year": 2026,
      "journal": "internal",
      "type": "model-description",
      "doi": "",
      "url": "",
      "population": "ANCESTOR users",
      "question": "How are recovery estimates produced?",
      "findings": "Recovery windows are derived from per-muscle defaults scaled by work performed, effort, style, experience, reported sleep, reported soreness/joint state, performance trend and bounded learned adaptation. They are estimates, not measurements.",
      "limitations": "Internal model description. Not externally validated. No physiological measurement is taken.",
      "relevance": "Every recovery figure in the app links here so the model and its limits are visible where the number appears.",
      "quality": "very-low",
      "lastReviewed": "2026-10-26",
      "reviewStatus": "reviewed",
      "identifierVerified": false,
      "verificationNote": "Internal explanatory note or model description — not a published source and not verifiable against an external registry.",
      "lessons": [
        "sleep-recovery",
        "scientific-literacy"
      ],
      "rules": [
        "recovery.estimate",
        "recovery.sleepBand",
        "decision.ladder"
      ]
    }
  ];

const EVIDENCE_BY_ID = {};
EVIDENCE.forEach(e => { EVIDENCE_BY_ID[e.id] = e; });

/* ------------------------------------------------------------------ API */
function evidence(id){ return EVIDENCE_BY_ID[id] || null; }
function evidenceFor(ids){ return (ids||[]).map(evidence).filter(Boolean); }
function evidenceForLesson(lessonId){ return EVIDENCE.filter(e => (e.lessons||[]).indexOf(lessonId) >= 0); }
function evidenceForRule(ruleId){ return EVIDENCE.filter(e => (e.rules||[]).indexOf(ruleId) >= 0); }

/* A record may only influence user-facing recommendations once it is
   reviewed AND of usable quality. Recency alone never qualifies. */
function canAffectRecommendations(e){
  return !!e && e.reviewStatus === 'reviewed' &&
         ['high','moderate'].indexOf(e.quality) >= 0;
}

function unverifiedIdentifiers(){ return EVIDENCE.filter(e => e.identifierVerified === false); }
function recordsMissingIdentifier(){ return EVIDENCE.filter(e => !e.doi && !e.pmid && !e.url); }
function libraryStats(){
  const byType = {}, byQuality = {};
  EVIDENCE.forEach(e => {
    byType[e.type] = (byType[e.type]||0) + 1;
    byQuality[e.quality] = (byQuality[e.quality]||0) + 1;
  });
  return {
    total: EVIDENCE.length,
    byType: byType, byQuality: byQuality,
    unverified: unverifiedIdentifiers().length,
    affecting: EVIDENCE.filter(canAffectRecommendations).length,
    lastReviewed: EVIDENCE.reduce((a,e) => !a || e.lastReviewed > a ? e.lastReviewed : a, '')
  };
}

const EVIDENCE_LIBRARY_NOTE =
  'Curated offline snapshot. Live literature retrieval is not available in this build, so coverage is partial and biased towards topics already used by ANCESTOR. ' +
  'All 12 published sources were verified on 2026-10-26 against TWO independent registries, NCBI PubMed and Crossref, and every DOI and PMID matched in both. ' +
  'Two errors were found and fixed by this process: one wrong DOI, and one record with the wrong journal, year and author list. Two further records are internal ' +
  'notes rather than published sources and are labelled as such wherever they appear. These registries are not the publishers; for formal citation, check the ' +
  'publisher record as well.';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EVIDENCE, EVIDENCE_BY_ID, evidence, evidenceFor, evidenceForLesson,
                     evidenceForRule, canAffectRecommendations, unverifiedIdentifiers,
                     recordsMissingIdentifier, libraryStats, EVIDENCE_LIBRARY_NOTE };
}
