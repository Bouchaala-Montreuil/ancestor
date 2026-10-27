/* ============================================================================
   ANCESTOR — screen strings (Performance Lab redesign)
   Keys prefixed by area. Missing keys fall back to English, never to blanks.
   ========================================================================== */

const TS = {};

TS.en = {
'nav.today':'Today','nav.session':'Session','nav.body':'Body','nav.progress':'Progress','nav.profile':'Profile',

'home.title':'Today','home.hello':'Good to see you','home.sub':'Decision, anatomy and current performance',
'home.decision':'Training decision','home.analysis':'Detailed analysis','home.performance':'Performance',
'home.lastSession':'Last session','home.nextSession':'Next session','home.insufficient':'Insufficient data',
'home.map':'Muscle map','home.timeline':'Your next seven days',

'decision.label':'Recommendation',
'decision.train':'TRAIN','decision.modify':'MODIFY','decision.rest':'REST',
'decision.confidence':'Confidence','decision.limits':'Limits of this recommendation',

'readiness.title':'Estimated availability','readiness.label':'availability',
'readiness.definition':'Time elapsed relative to the estimated recovery window. An estimate, not a measurement.',
'readiness.noscore':'Not enough data to estimate',

'state.ok':'Favourable','state.warn':'Caution','state.alert':'Restrictive','state.none':'No data',
'state.loading':'Loading','state.error':'Error','state.saved':'Saved','state.offline':'Offline',

'body.title':'Anatomy','body.side':'View','body.front':'Front','body.back':'Back',
'body.rotate':'Rotate','body.zoom':'Zoom to selection','body.reset':'Reset view','body.select':'Select a muscle group',
'body.note2d':'2D interactive anatomy — front / back, rotation, selection, zoom. Not a 3D model.',
'body.detail':'Muscle record','body.last':'Last recorded work','body.never':'Never recorded',
'body.exercises':'Associated exercises','body.sets':'Recent sets','body.trend':'Trend',
'body.recovery':'Estimated recovery','body.factors':'Factors','body.missing':'Missing data','body.reco':'Note',
'body.estimateNote':'Estimated from your log. Not a measurement of muscle tissue.',

'progress.title':'Progress','progress.overview':'Overview','progress.detail':'Analysis','progress.unknownEx':'Records name exercises this version does not have. They are kept, and exported unchanged.',
'progress.exercise':'Exercise','progress.period':'Period','progress.p30':'30 days','progress.p90':'90 days','progress.pall':'All time',
'progress.volume':'Volume by muscle group','progress.volumeDef':'Load × reps × contribution of each exercise',
'progress.sessions':'Sessions','progress.pr':'Personal records','progress.sets':'Sets','progress.reps':'Reps',
'progress.load':'Load','progress.date':'Date','progress.table':'Session log','progress.compare':'Comparison',
'progress.sample':'Illustrative example','progress.sampleNote':'Fictional data shown as an example only. It is not your data.',
'progress.start':'Log a first session','progress.best':'Best',

'chart.unit':'unit','chart.pr':'Record','chart.load':'Load','chart.e1rm':'Estimated 1RM',
'chart.nodata':'No data to display','chart.nodata.body':'Record a few sessions and the trend will appear here.',
'chart.onepoint.title':'One session recorded','chart.onepoint.body':'A single point cannot show a trend. Two or more sessions are needed before a progression can be drawn.',

'tl.sleep':'Sleep','tl.shift':'Work','tl.now':'Now',

'session.title':'Session','session.exercise':'Exercise','session.setOf':'Set',
'session.load':'Load','session.reps':'Reps','session.rir':'RIR','session.target':'Target',
'session.last':'Last time','session.validate':'Validate set','session.rest':'Rest','session.skipset':'Skip set',
'session.finish':'Finish session','session.discard':'Discard','session.summary':'Session summary',
'session.compare':'Versus last session','session.saved':'Session saved','session.prs':'New records',
'session.empty':'Enter a load and a rep count for at least one set.','session.sub':'Substitute',
'session.keep':'Keeps the movement pattern and the target muscles.','session.nosub':'No substitute available with your equipment.',
'session.draftRestored':'Session in progress restored','session.warmup':'Warm-up sets are not counted. Do them anyway.',
'session.cue':'Technique','session.planned':'Planned','session.noplan':'No session planned today',

'profile.title':'Profile','profile.planning':'Schedule','profile.workshifts':'Work shifts',
'profile.gProgramme':'Programme','profile.gBody':'Body & recovery',
'profile.gAccess':'Accessibility & display','profile.gData':'Data & about',
'profile.sleepLog':'Declared sleep','profile.data':'Your data','profile.about':'About',
'profile.rebuild':'Rebuild programme','profile.exercises':'Exercises','profile.limits':'Limitations',

'state.nodata':'No data','state.noresult':'No result for these filters','state.needSetup':'Not configured',
'onb.why':'Why we ask','onb.whyBody':'This adjusts your programme, your estimated recovery windows and your scheduling. You can change it at any time from the profile.'
};

TS.fr = {
'nav.today':'Aujourd\'hui','nav.session':'Séance','nav.body':'Corps','nav.progress':'Progression','nav.profile':'Profil',

'home.title':'Aujourd\'hui','home.hello':'Bonjour','home.sub':'Décision, anatomie et performance du moment',
'home.decision':'Décision d\'entraînement','home.analysis':'Analyse détaillée','home.performance':'Performance',
'home.lastSession':'Dernière séance','home.nextSession':'Prochaine séance','home.insufficient':'Données insuffisantes',
'home.map':'Carte musculaire','home.timeline':'Vos sept prochains jours',

'decision.label':'Recommandation',
'decision.train':'ENTRAÎNER','decision.modify':'ADAPTER','decision.rest':'REPOS',
'decision.confidence':'Confiance','decision.limits':'Limites de cette recommandation',

'readiness.title':'Disponibilité estimée','readiness.label':'disponibilité',
'readiness.definition':'Temps écoulé rapporté à la fenêtre de récupération estimée. Une estimation, pas une mesure.',
'readiness.noscore':'Données insuffisantes pour estimer',

'state.ok':'Favorable','state.warn':'Prudence','state.alert':'Restrictif','state.none':'Aucune donnée',
'state.loading':'Chargement','state.error':'Erreur','state.saved':'Enregistré','state.offline':'Hors ligne',

'body.title':'Anatomie','body.side':'Vue','body.front':'Face','body.back':'Dos',
'body.rotate':'Rotation','body.zoom':'Zoom sur la sélection','body.reset':'Vue générale','body.select':'Sélectionnez un groupe musculaire',
'body.note2d':'Anatomie interactive 2D — face / dos, rotation, sélection, zoom. Ce n\'est pas un modèle 3D.',
'body.detail':'Fiche musculaire','body.last':'Dernier travail enregistré','body.never':'Jamais enregistré',
'body.exercises':'Exercices associés','body.sets':'Séries récentes','body.trend':'Tendance',
'body.recovery':'Récupération estimée','body.factors':'Facteurs','body.missing':'Données manquantes','body.reco':'Note',
'body.estimateNote':'Estimé à partir de votre journal. Ce n\'est pas une mesure du tissu musculaire.',

'progress.title':'Progression','progress.overview':'Synthèse','progress.detail':'Analyse','progress.unknownEx':'Certaines séances citent des exercices absents de cette version. Ils sont conservés et exportés tels quels.',
'progress.exercise':'Exercice','progress.period':'Période','progress.p30':'30 jours','progress.p90':'90 jours','progress.pall':'Depuis le début',
'progress.volume':'Volume par groupe musculaire','progress.volumeDef':'Charge × répétitions × contribution de chaque exercice',
'progress.sessions':'Séances','progress.pr':'Records personnels','progress.sets':'Séries','progress.reps':'Répétitions',
'progress.load':'Charge','progress.date':'Date','progress.table':'Journal des séances','progress.compare':'Comparaison',
'progress.sample':'Exemple illustratif','progress.sampleNote':'Données fictives présentées à titre d\'exemple. Ce ne sont pas vos données.',
'progress.start':'Enregistrer une première séance','progress.best':'Meilleur',

'chart.unit':'unité','chart.pr':'Record','chart.load':'Charge','chart.e1rm':'1RM estimé',
'chart.nodata':'Aucune donnée à afficher','chart.nodata.body':'Enregistrez quelques séances et la tendance apparaîtra ici.',
'chart.onepoint.title':'Une seule séance enregistrée','chart.onepoint.body':'Un point unique ne montre aucune tendance. Deux séances ou plus sont nécessaires avant de tracer une progression.',

'tl.sleep':'Sommeil','tl.shift':'Travail','tl.now':'Maintenant',

'session.title':'Séance','session.exercise':'Exercice','session.setOf':'Série',
'session.load':'Charge','session.reps':'Répétitions','session.rir':'RIR','session.target':'Cible',
'session.last':'Dernière fois','session.validate':'Valider la série','session.rest':'Repos','session.skipset':'Passer la série',
'session.finish':'Terminer la séance','session.discard':'Abandonner','session.summary':'Résumé de la séance',
'session.compare':'Par rapport à la dernière séance','session.saved':'Séance enregistrée','session.prs':'Nouveaux records',
'session.empty':'Saisissez une charge et un nombre de répétitions pour au moins une série.','session.sub':'Remplacer',
'session.keep':'Conserve le schéma de mouvement et les muscles ciblés.','session.nosub':'Aucun substitut disponible avec votre matériel.',
'session.draftRestored':'Séance en cours restaurée','session.warmup':'Les séries d\'échauffement ne comptent pas. Faites-les quand même.',
'session.cue':'Technique','session.planned':'Prévue','session.noplan':'Aucune séance prévue aujourd\'hui',

'profile.title':'Profil','profile.planning':'Planning','profile.workshifts':'Horaires de travail',
'profile.gProgramme':'Programme','profile.gBody':'Corps et récupération',
'profile.gAccess':'Accessibilité et affichage','profile.gData':'Données et à propos',
'profile.sleepLog':'Sommeil déclaré','profile.data':'Vos données','profile.about':'À propos',
'profile.rebuild':'Reconstruire le programme','profile.exercises':'Exercices','profile.limits':'Limitations',

'state.nodata':'Aucune donnée','state.noresult':'Aucun résultat pour ces filtres','state.needSetup':'Non configuré',
'onb.why':'Pourquoi cette question','onb.whyBody':'Cela ajuste votre programme, vos fenêtres de récupération estimées et votre planification. Modifiable à tout moment depuis le profil.'
};

TS.es = {
'nav.today':'Hoy','nav.session':'Sesión','nav.body':'Cuerpo','nav.progress':'Progreso','nav.profile':'Perfil',
'home.title':'Hoy','home.hello':'Hola','home.sub':'Decisión, anatomía y rendimiento actual',
'home.decision':'Decisión de entrenamiento','home.analysis':'Análisis detallado','home.performance':'Rendimiento',
'home.lastSession':'Última sesión','home.nextSession':'Próxima sesión','home.insufficient':'Datos insuficientes',
'home.map':'Mapa muscular','home.timeline':'Tus próximos siete días',
'decision.label':'Recomendación','decision.train':'ENTRENAR','decision.modify':'ADAPTAR','decision.rest':'DESCANSO',
'decision.confidence':'Confianza','decision.limits':'Límites de esta recomendación',
'readiness.title':'Disponibilidad estimada','readiness.label':'disponibilidad',
'readiness.definition':'Tiempo transcurrido respecto a la ventana de recuperación estimada. Una estimación, no una medición.',
'readiness.noscore':'Datos insuficientes para estimar',
'state.ok':'Favorable','state.warn':'Precaución','state.alert':'Restrictivo','state.none':'Sin datos',
'state.loading':'Cargando','state.error':'Error','state.saved':'Guardado','state.offline':'Sin conexión',
'body.title':'Anatomía','body.side':'Vista','body.front':'Frente','body.back':'Espalda',
'body.rotate':'Rotar','body.zoom':'Acercar a la selección','body.reset':'Vista general','body.select':'Selecciona un grupo muscular',
'body.note2d':'Anatomía interactiva 2D — frente / espalda, rotación, selección, zoom. No es un modelo 3D.',
'body.detail':'Ficha muscular','body.last':'Último trabajo registrado','body.never':'Nunca registrado',
'body.exercises':'Ejercicios asociados','body.sets':'Series recientes','body.trend':'Tendencia',
'body.recovery':'Recuperación estimada','body.factors':'Factores','body.missing':'Datos faltantes','body.reco':'Nota',
'body.estimateNote':'Estimado a partir de tu registro. No es una medición del tejido muscular.',
'progress.title':'Progreso','progress.overview':'Resumen','progress.detail':'Análisis','progress.unknownEx':'Algunos registros citan ejercicios que esta versión no incluye. Se conservan y se exportan tal cual.',
'progress.exercise':'Ejercicio','progress.period':'Periodo','progress.p30':'30 días','progress.p90':'90 días','progress.pall':'Todo',
'progress.volume':'Volumen por grupo muscular','progress.volumeDef':'Carga × repeticiones × contribución de cada ejercicio',
'progress.sessions':'Sesiones','progress.pr':'Récords personales','progress.sets':'Series','progress.reps':'Repeticiones',
'progress.load':'Carga','progress.date':'Fecha','progress.table':'Registro de sesiones','progress.compare':'Comparación',
'progress.sample':'Ejemplo ilustrativo','progress.sampleNote':'Datos ficticios mostrados solo como ejemplo. No son tus datos.',
'progress.start':'Registrar una primera sesión','progress.best':'Mejor',
'chart.unit':'unidad','chart.pr':'Récord','chart.load':'Carga','chart.e1rm':'1RM estimado',
'chart.nodata':'Sin datos que mostrar','chart.nodata.body':'Registra algunas sesiones y la tendencia aparecerá aquí.',
'chart.onepoint.title':'Solo una sesión registrada','chart.onepoint.body':'Un punto único no muestra tendencia. Se necesitan dos o más sesiones antes de trazar una progresión.',
'tl.sleep':'Sueño','tl.shift':'Trabajo','tl.now':'Ahora',
'session.title':'Sesión','session.exercise':'Ejercicio','session.setOf':'Serie',
'session.load':'Carga','session.reps':'Repeticiones','session.rir':'RIR','session.target':'Objetivo',
'session.last':'Última vez','session.validate':'Validar serie','session.rest':'Descanso','session.skipset':'Omitir serie',
'session.finish':'Terminar sesión','session.discard':'Descartar','session.summary':'Resumen de la sesión',
'session.compare':'Frente a la última sesión','session.saved':'Sesión guardada','session.prs':'Nuevos récords',
'session.empty':'Introduce carga y repeticiones en al menos una serie.','session.sub':'Sustituir',
'session.keep':'Mantiene el patrón de movimiento y los músculos objetivo.','session.nosub':'Sin sustituto disponible con tu equipo.',
'session.draftRestored':'Sesión en curso restaurada','session.warmup':'Las series de calentamiento no cuentan. Hazlas igualmente.',
'session.cue':'Técnica','session.planned':'Prevista','session.noplan':'Ninguna sesión prevista hoy',
'profile.title':'Perfil','profile.planning':'Horario','profile.workshifts':'Horarios de trabajo',
'profile.gProgramme':'Programa','profile.gBody':'Cuerpo y recuperación',
'profile.gAccess':'Accesibilidad y pantalla','profile.gData':'Datos y acerca de',
'profile.sleepLog':'Sueño declarado','profile.data':'Tus datos','profile.about':'Acerca de',
'profile.rebuild':'Reconstruir programa','profile.exercises':'Ejercicios','profile.limits':'Limitaciones',
'state.nodata':'Sin datos','state.noresult':'Sin resultados para estos filtros','state.needSetup':'Sin configurar',
'onb.why':'Por qué lo preguntamos','onb.whyBody':'Ajusta tu programa, tus ventanas de recuperación estimadas y tu planificación. Puedes cambiarlo cuando quieras desde el perfil.'
};

TS.de = {
'nav.today':'Heute','nav.session':'Einheit','nav.body':'Körper','nav.progress':'Fortschritt','nav.profile':'Profil',
'home.title':'Heute','home.hello':'Guten Tag','home.sub':'Entscheidung, Anatomie und aktuelle Leistung',
'home.decision':'Trainingsentscheidung','home.analysis':'Detaillierte Analyse','home.performance':'Leistung',
'home.lastSession':'Letzte Einheit','home.nextSession':'Nächste Einheit','home.insufficient':'Daten unzureichend',
'home.map':'Muskelkarte','home.timeline':'Deine nächsten sieben Tage',
'decision.label':'Empfehlung','decision.train':'TRAINIEREN','decision.modify':'ANPASSEN','decision.rest':'RUHE',
'decision.confidence':'Vertrauen','decision.limits':'Grenzen dieser Empfehlung',
'readiness.title':'Geschätzte Verfügbarkeit','readiness.label':'Verfügbarkeit',
'readiness.definition':'Vergangene Zeit im Verhältnis zum geschätzten Regenerationsfenster. Eine Schätzung, keine Messung.',
'readiness.noscore':'Zu wenige Daten für eine Schätzung',
'state.ok':'Günstig','state.warn':'Vorsicht','state.alert':'Einschränkend','state.none':'Keine Daten',
'state.loading':'Lädt','state.error':'Fehler','state.saved':'Gespeichert','state.offline':'Offline',
'body.title':'Anatomie','body.side':'Ansicht','body.front':'Vorne','body.back':'Hinten',
'body.rotate':'Drehen','body.zoom':'Auf Auswahl zoomen','body.reset':'Gesamtansicht','body.select':'Muskelgruppe wählen',
'body.note2d':'Interaktive 2D-Anatomie — vorne / hinten, Drehung, Auswahl, Zoom. Kein 3D-Modell.',
'body.detail':'Muskelprotokoll','body.last':'Letzte erfasste Belastung','body.never':'Nie erfasst',
'body.exercises':'Zugehörige Übungen','body.sets':'Letzte Sätze','body.trend':'Trend',
'body.recovery':'Geschätzte Regeneration','body.factors':'Faktoren','body.missing':'Fehlende Daten','body.reco':'Hinweis',
'body.estimateNote':'Aus deinem Protokoll geschätzt. Keine Messung des Muskelgewebes.',
'progress.title':'Fortschritt','progress.overview':'Überblick','progress.detail':'Analyse','progress.unknownEx':'Einige Einträge nennen Übungen, die diese Version nicht enthält. Sie bleiben erhalten und werden unverändert exportiert.',
'progress.exercise':'Übung','progress.period':'Zeitraum','progress.p30':'30 Tage','progress.p90':'90 Tage','progress.pall':'Gesamt',
'progress.volume':'Volumen pro Muskelgruppe','progress.volumeDef':'Last × Wiederholungen × Beitrag jeder Übung',
'progress.sessions':'Einheiten','progress.pr':'Persönliche Rekorde','progress.sets':'Sätze','progress.reps':'Wdh.',
'progress.load':'Last','progress.date':'Datum','progress.table':'Einheitenprotokoll','progress.compare':'Vergleich',
'progress.sample':'Anschauliches Beispiel','progress.sampleNote':'Fiktive Daten, nur als Beispiel. Nicht deine Daten.',
'progress.start':'Erste Einheit erfassen','progress.best':'Beste',
'chart.unit':'Einheit','chart.pr':'Rekord','chart.load':'Last','chart.e1rm':'Geschätztes 1RM',
'chart.nodata':'Keine Daten','chart.nodata.body':'Erfasse einige Einheiten, dann erscheint der Trend hier.',
'chart.onepoint.title':'Erst eine Einheit erfasst','chart.onepoint.body':'Ein einzelner Punkt zeigt keinen Trend. Zwei oder mehr Einheiten sind nötig, bevor ein Verlauf gezeichnet werden kann.',
'tl.sleep':'Schlaf','tl.shift':'Arbeit','tl.now':'Jetzt',
'session.title':'Einheit','session.exercise':'Übung','session.setOf':'Satz',
'session.load':'Last','session.reps':'Wdh.','session.rir':'RIR','session.target':'Ziel',
'session.last':'Letztes Mal','session.validate':'Satz bestätigen','session.rest':'Pause','session.skipset':'Satz überspringen',
'session.finish':'Einheit beenden','session.discard':'Verwerfen','session.summary':'Zusammenfassung',
'session.compare':'Gegenüber der letzten Einheit','session.saved':'Einheit gespeichert','session.prs':'Neue Rekorde',
'session.empty':'Gib Last und Wiederholungen für mindestens einen Satz ein.','session.sub':'Ersetzen',
'session.keep':'Behält Bewegungsmuster und Zielmuskeln bei.','session.nosub':'Mit deinem Equipment kein Ersatz verfügbar.',
'session.draftRestored':'Laufende Einheit wiederhergestellt','session.warmup':'Aufwärmsätze zählen nicht. Mach sie trotzdem.',
'session.cue':'Technik','session.planned':'Geplant','session.noplan':'Heute keine Einheit geplant',
'profile.title':'Profil','profile.planning':'Zeitplan','profile.workshifts':'Arbeitszeiten',
'profile.gProgramme':'Programm','profile.gBody':'Körper & Erholung',
'profile.gAccess':'Barrierefreiheit & Anzeige','profile.gData':'Daten & über',
'profile.sleepLog':'Angegebener Schlaf','profile.data':'Deine Daten','profile.about':'Über',
'profile.rebuild':'Programm neu aufbauen','profile.exercises':'Übungen','profile.limits':'Einschränkungen',
'state.nodata':'Keine Daten','state.noresult':'Kein Ergebnis für diese Filter','state.needSetup':'Nicht konfiguriert',
'onb.why':'Warum wir fragen','onb.whyBody':'Dies passt dein Programm, deine geschätzten Regenerationsfenster und deine Planung an. Jederzeit im Profil änderbar.'
};

TS.it = {
'nav.today':'Oggi','nav.session':'Sessione','nav.body':'Corpo','nav.progress':'Progressi','nav.profile':'Profilo',
'home.title':'Oggi','home.hello':'Buongiorno','home.sub':'Decisione, anatomia e prestazione attuale',
'home.decision':'Decisione di allenamento','home.analysis':'Analisi dettagliata','home.performance':'Prestazione',
'home.lastSession':'Ultima sessione','home.nextSession':'Prossima sessione','home.insufficient':'Dati insufficienti',
'home.map':'Mappa muscolare','home.timeline':'I tuoi prossimi sette giorni',
'decision.label':'Raccomandazione','decision.train':'ALLENA','decision.modify':'ADATTA','decision.rest':'RIPOSO',
'decision.confidence':'Affidabilità','decision.limits':'Limiti di questa raccomandazione',
'readiness.title':'Disponibilità stimata','readiness.label':'disponibilità',
'readiness.definition':'Tempo trascorso rispetto alla finestra di recupero stimata. Una stima, non una misurazione.',
'readiness.noscore':'Dati insufficienti per stimare',
'state.ok':'Favorevole','state.warn':'Attenzione','state.alert':'Limitante','state.none':'Nessun dato',
'state.loading':'Caricamento','state.error':'Errore','state.saved':'Salvato','state.offline':'Offline',
'body.title':'Anatomia','body.side':'Vista','body.front':'Fronte','body.back':'Retro',
'body.rotate':'Ruota','body.zoom':'Zoom sulla selezione','body.reset':'Vista generale','body.select':'Seleziona un gruppo muscolare',
'body.note2d':'Anatomia interattiva 2D — fronte / retro, rotazione, selezione, zoom. Non è un modello 3D.',
'body.detail':'Scheda muscolare','body.last':'Ultimo lavoro registrato','body.never':'Mai registrato',
'body.exercises':'Esercizi associati','body.sets':'Serie recenti','body.trend':'Trend',
'body.recovery':'Recupero stimato','body.factors':'Fattori','body.missing':'Dati mancanti','body.reco':'Nota',
'body.estimateNote':'Stimato dal tuo registro. Non è una misurazione del tessuto muscolare.',
'progress.title':'Progressi','progress.overview':'Sintesi','progress.detail':'Analisi','progress.unknownEx':'Alcune voci citano esercizi assenti in questa versione. Restano conservate ed esportate così come sono.',
'progress.exercise':'Esercizio','progress.period':'Periodo','progress.p30':'30 giorni','progress.p90':'90 giorni','progress.pall':'Totale',
'progress.volume':'Volume per gruppo muscolare','progress.volumeDef':'Carico × ripetizioni × contributo di ogni esercizio',
'progress.sessions':'Sessioni','progress.pr':'Record personali','progress.sets':'Serie','progress.reps':'Ripetizioni',
'progress.load':'Carico','progress.date':'Data','progress.table':'Registro sessioni','progress.compare':'Confronto',
'progress.sample':'Esempio illustrativo','progress.sampleNote':'Dati fittizi mostrati solo come esempio. Non sono i tuoi dati.',
'progress.start':'Registra una prima sessione','progress.best':'Migliore',
'chart.unit':'unità','chart.pr':'Record','chart.load':'Carico','chart.e1rm':'1RM stimato',
'chart.nodata':'Nessun dato da mostrare','chart.nodata.body':'Registra alcune sessioni e il trend apparirà qui.',
'chart.onepoint.title':'Una sola sessione registrata','chart.onepoint.body':'Un punto singolo non mostra un trend. Servono due o più sessioni prima di tracciare una progressione.',
'tl.sleep':'Sonno','tl.shift':'Lavoro','tl.now':'Ora',
'session.title':'Sessione','session.exercise':'Esercizio','session.setOf':'Serie',
'session.load':'Carico','session.reps':'Ripetizioni','session.rir':'RIR','session.target':'Obiettivo',
'session.last':'Ultima volta','session.validate':'Conferma serie','session.rest':'Recupero','session.skipset':'Salta serie',
'session.finish':'Termina sessione','session.discard':'Annulla','session.summary':'Riepilogo sessione',
'session.compare':'Rispetto all\'ultima sessione','session.saved':'Sessione salvata','session.prs':'Nuovi record',
'session.empty':'Inserisci carico e ripetizioni per almeno una serie.','session.sub':'Sostituisci',
'session.keep':'Mantiene lo schema di movimento e i muscoli target.','session.nosub':'Nessun sostituto disponibile con la tua attrezzatura.',
'session.draftRestored':'Sessione in corso ripristinata','session.warmup':'Le serie di riscaldamento non contano. Falle comunque.',
'session.cue':'Tecnica','session.planned':'Prevista','session.noplan':'Nessuna sessione prevista oggi',
'profile.title':'Profilo','profile.planning':'Programma','profile.workshifts':'Orari di lavoro',
'profile.gProgramme':'Programma','profile.gBody':'Corpo e recupero',
'profile.gAccess':'Accessibilità e schermo','profile.gData':'Dati e informazioni',
'profile.sleepLog':'Sonno dichiarato','profile.data':'I tuoi dati','profile.about':'Informazioni',
'profile.rebuild':'Ricostruisci programma','profile.exercises':'Esercizi','profile.limits':'Limitazioni',
'state.nodata':'Nessun dato','state.noresult':'Nessun risultato per questi filtri','state.needSetup':'Non configurato',
'onb.why':'Perché lo chiediamo','onb.whyBody':'Questo adatta il tuo programma, le finestre di recupero stimate e la pianificazione. Modificabile in qualsiasi momento dal profilo.'
};

TS.nl = {
'nav.today':'Vandaag','nav.session':'Sessie','nav.body':'Lichaam','nav.progress':'Voortgang','nav.profile':'Profiel',
'home.title':'Vandaag','home.hello':'Goedendag','home.sub':'Beslissing, anatomie en huidige prestatie',
'home.decision':'Trainingsbeslissing','home.analysis':'Gedetailleerde analyse','home.performance':'Prestatie',
'home.lastSession':'Laatste sessie','home.nextSession':'Volgende sessie','home.insufficient':'Onvoldoende gegevens',
'home.map':'Spierkaart','home.timeline':'Je komende zeven dagen',
'decision.label':'Aanbeveling','decision.train':'TRAINEN','decision.modify':'AANPASSEN','decision.rest':'RUST',
'decision.confidence':'Betrouwbaarheid','decision.limits':'Beperkingen van deze aanbeveling',
'readiness.title':'Geschatte beschikbaarheid','readiness.label':'beschikbaarheid',
'readiness.definition':'Verstreken tijd ten opzichte van het geschatte herstelvenster. Een schatting, geen meting.',
'readiness.noscore':'Onvoldoende gegevens om te schatten',
'state.ok':'Gunstig','state.warn':'Voorzichtig','state.alert':'Beperkend','state.none':'Geen gegevens',
'state.loading':'Laden','state.error':'Fout','state.saved':'Opgeslagen','state.offline':'Offline',
'body.title':'Anatomie','body.side':'Aanzicht','body.front':'Voor','body.back':'Achter',
'body.rotate':'Draaien','body.zoom':'Inzoomen op selectie','body.reset':'Totaalbeeld','body.select':'Kies een spiergroep',
'body.note2d':'Interactieve 2D-anatomie — voor / achter, draaien, selectie, zoom. Geen 3D-model.',
'body.detail':'Spierkaart','body.last':'Laatst geregistreerde werk','body.never':'Nooit geregistreerd',
'body.exercises':'Bijbehorende oefeningen','body.sets':'Recente sets','body.trend':'Trend',
'body.recovery':'Geschat herstel','body.factors':'Factoren','body.missing':'Ontbrekende gegevens','body.reco':'Noot',
'body.estimateNote':'Geschat op basis van je logboek. Geen meting van spierweefsel.',
'progress.title':'Voortgang','progress.overview':'Overzicht','progress.detail':'Analyse','progress.unknownEx':'Sommige registraties noemen oefeningen die deze versie niet heeft. Ze blijven bewaard en worden ongewijzigd geëxporteerd.',
'progress.exercise':'Oefening','progress.period':'Periode','progress.p30':'30 dagen','progress.p90':'90 dagen','progress.pall':'Alles',
'progress.volume':'Volume per spiergroep','progress.volumeDef':'Gewicht × herhalingen × bijdrage van elke oefening',
'progress.sessions':'Sessies','progress.pr':'Persoonlijke records','progress.sets':'Sets','progress.reps':'Herh.',
'progress.load':'Gewicht','progress.date':'Datum','progress.table':'Sessielogboek','progress.compare':'Vergelijking',
'progress.sample':'Illustratief voorbeeld','progress.sampleNote':'Fictieve gegevens, alleen als voorbeeld. Niet jouw gegevens.',
'progress.start':'Registreer een eerste sessie','progress.best':'Beste',
'chart.unit':'eenheid','chart.pr':'Record','chart.load':'Gewicht','chart.e1rm':'Geschat 1RM',
'chart.nodata':'Geen gegevens om te tonen','chart.nodata.body':'Registreer een paar sessies en de trend verschijnt hier.',
'chart.onepoint.title':'Eén sessie geregistreerd','chart.onepoint.body':'Eén punt laat geen trend zien. Twee of meer sessies zijn nodig voordat een verloop getekend kan worden.',
'tl.sleep':'Slaap','tl.shift':'Werk','tl.now':'Nu',
'session.title':'Sessie','session.exercise':'Oefening','session.setOf':'Set',
'session.load':'Gewicht','session.reps':'Herhalingen','session.rir':'RIR','session.target':'Doel',
'session.last':'Vorige keer','session.validate':'Set bevestigen','session.rest':'Rust','session.skipset':'Set overslaan',
'session.finish':'Sessie afronden','session.discard':'Verwerpen','session.summary':'Samenvatting',
'session.compare':'Ten opzichte van de vorige sessie','session.saved':'Sessie opgeslagen','session.prs':'Nieuwe records',
'session.empty':'Vul gewicht en herhalingen in voor minstens één set.','session.sub':'Vervangen',
'session.keep':'Behoudt het bewegingspatroon en de doelspieren.','session.nosub':'Geen vervanger beschikbaar met jouw materiaal.',
'session.draftRestored':'Lopende sessie hersteld','session.warmup':'Warming-upsets tellen niet. Doe ze toch.',
'session.cue':'Techniek','session.planned':'Gepland','session.noplan':'Vandaag geen sessie gepland',
'profile.title':'Profiel','profile.planning':'Rooster','profile.workshifts':'Werktijden',
'profile.gProgramme':'Programma','profile.gBody':'Lichaam & herstel',
'profile.gAccess':'Toegankelijkheid en weergave','profile.gData':'Gegevens en over',
'profile.sleepLog':'Opgegeven slaap','profile.data':'Jouw gegevens','profile.about':'Over',
'profile.rebuild':'Programma herbouwen','profile.exercises':'Oefeningen','profile.limits':'Beperkingen',
'state.nodata':'Geen gegevens','state.noresult':'Geen resultaat voor deze filters','state.needSetup':'Niet ingesteld',
'onb.why':'Waarom we dit vragen','onb.whyBody':'Dit past je programma, je geschatte herstelvensters en je planning aan. Altijd aanpasbaar via het profiel.'
};

Object.keys(TS).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TS[l]); });

/* ------------------------------------------------------------------
   Second-pass keys discovered while wiring the redesigned screens.
   Kept in the same merge pattern so new languages stay a copy/paste.
   ------------------------------------------------------------------ */
const TS2 = {

en:{
'home.quick':'Quick entry','home.noplan':'No session planned','home.correct':'Correct an input',
'prog.plannedShort':'planned','readiness.definitionShort':'21-day trend',
'trend.up':'Rising','trend.down':'Falling','trend.flat':'Stable','trend.unknown':'Not enough data',
'sleep.avg':'average','sleep.entries':'entries','shift.last7':'in the last 7 days','shift.nights':'nights',
'body.tracked':'groups tracked','body.left':'remaining','body.contribution':'Contribution',
'body.observations':'observations','body.neverBody':'No set recorded','body.neverHint':'This group will appear once an exercise that targets it has been logged.',
'progress.nodata':'No session recorded','progress.nodataBody':'Your trends, volumes and records will appear here once you have logged a first session.',
'session.noplanBody':'Complete the onboarding or rebuild your programme to get a planned session.',
'session.targetHit':'Target reached','session.skipped':'Skipped','session.nosubBody':'No other exercise in your configuration targets these muscles in the same way.',
'session.restDone':'Rest complete','onb.name':'Name','onb.redo':'Redo onboarding',
'decision.trainWhy':'Proceed with the planned session.','decision.modifyWhy':'Adapt the session: reduce the volume or the load.','decision.restWhy':'Prioritise recovery today.'
},
fr:{
'home.quick':'Saisie rapide','home.noplan':'Aucune séance prévue','home.correct':'Corriger une donnée',
'prog.plannedShort':'prévues','readiness.definitionShort':'tendance 21 jours',
'trend.up':'En hausse','trend.down':'En baisse','trend.flat':'Stable','trend.unknown':'Données insuffisantes',
'sleep.avg':'en moyenne','sleep.entries':'entrées','shift.last7':'sur 7 jours','shift.nights':'nuits',
'body.tracked':'groupes suivis','body.left':'restant','body.contribution':'Contribution',
'body.observations':'observations','body.neverBody':'Aucune série enregistrée','body.neverHint':'Ce groupe apparaîtra dès qu\'un exercice le ciblant aura été enregistré.',
'progress.nodata':'Aucune séance enregistrée','progress.nodataBody':'Vos tendances, volumes et records apparaîtront ici après une première séance.',
'session.noplanBody':'Terminez la configuration ou reconstruisez votre programme pour obtenir une séance planifiée.',
'session.targetHit':'Cible atteinte','session.skipped':'Passée','session.nosubBody':'Aucun autre exercice de votre configuration ne cible ces muscles de la même façon.',
'session.restDone':'Repos terminé','onb.name':'Nom','onb.redo':'Refaire la configuration',
'decision.trainWhy':'Effectuez la séance prévue.','decision.modifyWhy':'Adaptez la séance : réduisez le volume ou la charge.','decision.restWhy':'Faites de la récupération une priorité aujourd\'hui.'
},
es:{
'home.quick':'Entrada rápida','home.noplan':'Ninguna sesión prevista','home.correct':'Corregir un dato',
'prog.plannedShort':'previstas','readiness.definitionShort':'tendencia 21 días',
'trend.up':'Al alza','trend.down':'A la baja','trend.flat':'Estable','trend.unknown':'Datos insuficientes',
'sleep.avg':'de media','sleep.entries':'entradas','shift.last7':'en los últimos 7 días','shift.nights':'noches',
'body.tracked':'grupos seguidos','body.left':'restante','body.contribution':'Contribución',
'body.observations':'observaciones','body.neverBody':'Ninguna serie registrada','body.neverHint':'Este grupo aparecerá cuando se registre un ejercicio que lo trabaje.',
'progress.nodata':'Ninguna sesión registrada','progress.nodataBody':'Tus tendencias, volúmenes y récords aparecerán aquí tras registrar una primera sesión.',
'session.noplanBody':'Completa la configuración o reconstruye tu programa para obtener una sesión planificada.',
'session.targetHit':'Objetivo alcanzado','session.skipped':'Omitida','session.nosubBody':'Ningún otro ejercicio de tu configuración trabaja estos músculos del mismo modo.',
'session.restDone':'Descanso completado','onb.name':'Nombre','onb.redo':'Repetir configuración',
'decision.trainWhy':'Realiza la sesión prevista.','decision.modifyWhy':'Adapta la sesión: reduce el volumen o la carga.','decision.restWhy':'Prioriza la recuperación hoy.'
},
de:{
'home.quick':'Schnelleingabe','home.noplan':'Keine Einheit geplant','home.correct':'Eingabe korrigieren',
'prog.plannedShort':'geplant','readiness.definitionShort':'21-Tage-Trend',
'trend.up':'Steigend','trend.down':'Fallend','trend.flat':'Stabil','trend.unknown':'Daten unzureichend',
'sleep.avg':'im Schnitt','sleep.entries':'Einträge','shift.last7':'in den letzten 7 Tagen','shift.nights':'Nächte',
'body.tracked':'erfasste Gruppen','body.left':'verbleibend','body.contribution':'Beitrag',
'body.observations':'Beobachtungen','body.neverBody':'Kein Satz erfasst','body.neverHint':'Diese Gruppe erscheint, sobald eine sie betreffende Übung erfasst wurde.',
'progress.nodata':'Keine Einheit erfasst','progress.nodataBody':'Trends, Volumen und Rekorde erscheinen hier nach der ersten erfassten Einheit.',
'session.noplanBody':'Schließe die Einrichtung ab oder baue dein Programm neu auf, um eine geplante Einheit zu erhalten.',
'session.targetHit':'Ziel erreicht','session.skipped':'Übersprungen','session.nosubBody':'Keine andere Übung deiner Konfiguration trainiert diese Muskeln auf dieselbe Weise.',
'session.restDone':'Pause beendet','onb.name':'Name','onb.redo':'Einrichtung wiederholen',
'decision.trainWhy':'Führe die geplante Einheit aus.','decision.modifyWhy':'Passe die Einheit an: reduziere Volumen oder Last.','decision.restWhy':'Setze heute die Regeneration an erste Stelle.'
},
it:{
'home.quick':'Inserimento rapido','home.noplan':'Nessuna sessione prevista','home.correct':'Correggi un dato',
'prog.plannedShort':'previste','readiness.definitionShort':'trend 21 giorni',
'trend.up':'In salita','trend.down':'In calo','trend.flat':'Stabile','trend.unknown':'Dati insufficienti',
'sleep.avg':'in media','sleep.entries':'voci','shift.last7':'negli ultimi 7 giorni','shift.nights':'notti',
'body.tracked':'gruppi tracciati','body.left':'rimanente','body.contribution':'Contributo',
'body.observations':'osservazioni','body.neverBody':'Nessuna serie registrata','body.neverHint':'Questo gruppo apparirà quando verrà registrato un esercizio che lo coinvolge.',
'progress.nodata':'Nessuna sessione registrata','progress.nodataBody':'Trend, volumi e record appariranno qui dopo la prima sessione registrata.',
'session.noplanBody':'Completa la configurazione o ricostruisci il programma per ottenere una sessione pianificata.',
'session.targetHit':'Obiettivo raggiunto','session.skipped':'Saltata','session.nosubBody':'Nessun altro esercizio della tua configurazione coinvolge questi muscoli allo stesso modo.',
'session.restDone':'Recupero completato','onb.name':'Nome','onb.redo':'Ripeti la configurazione',
'decision.trainWhy':'Esegui la sessione prevista.','decision.modifyWhy':'Adatta la sessione: riduci volume o carico.','decision.restWhy':'Dai priorità al recupero oggi.'
},
nl:{
'home.quick':'Snelle invoer','home.noplan':'Geen sessie gepland','home.correct':'Een invoer corrigeren',
'prog.plannedShort':'gepland','readiness.definitionShort':'trend 21 dagen',
'trend.up':'Stijgend','trend.down':'Dalend','trend.flat':'Stabiel','trend.unknown':'Onvoldoende gegevens',
'sleep.avg':'gemiddeld','sleep.entries':'invoeren','shift.last7':'in de laatste 7 dagen','shift.nights':'nachten',
'body.tracked':'gevolgde groepen','body.left':'resterend','body.contribution':'Bijdrage',
'body.observations':'waarnemingen','body.neverBody':'Geen set geregistreerd','body.neverHint':'Deze groep verschijnt zodra een oefening die ze belast is geregistreerd.',
'progress.nodata':'Geen sessie geregistreerd','progress.nodataBody':'Je trends, volumes en records verschijnen hier na een eerste geregistreerde sessie.',
'session.noplanBody':'Voltooi de configuratie of herbouw je programma om een geplande sessie te krijgen.',
'session.targetHit':'Doel bereikt','session.skipped':'Overgeslagen','session.nosubBody':'Geen andere oefening in je configuratie belast deze spieren op dezelfde manier.',
'session.restDone':'Rust voltooid','onb.name':'Naam','onb.redo':'Configuratie herhalen',
'decision.trainWhy':'Voer de geplande sessie uit.','decision.modifyWhy':'Pas de sessie aan: verlaag volume of gewicht.','decision.restWhy':'Geef herstel vandaag voorrang.'
}

};
Object.keys(TS2).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TS2[l]); });

/* ------------------------------------------------------------------
   QA pass: muscle-record actions, anatomy affordance, language setting.
   ------------------------------------------------------------------ */
const TS3 = {

en:{
'body.close':'Close','body.train':'Log a session','body.zoomTo':'Zoom to this muscle',
'body.fullView':'Full body view','body.tapHint':'Tap a muscle group to open its record',
'body.contributionNote':'Share of that exercise\'s work falling on this muscle group.',
'body.nodataNote':'No recorded set yet. Log a session that targets this muscle to populate the record.',
'profile.language':'Language'
},
fr:{
'body.close':'Fermer','body.train':'Enregistrer une séance','body.zoomTo':'Zoom sur ce muscle',
'body.fullView':'Vue corps entier','body.tapHint':'Touchez un groupe musculaire pour ouvrir sa fiche',
'body.contributionNote':'Part du travail de cet exercice qui revient à ce groupe musculaire.',
'body.nodataNote':'Aucune série enregistrée. Enregistrez une séance ciblant ce muscle pour remplir la fiche.',
'profile.language':'Langue'
},
es:{
'body.close':'Cerrar','body.train':'Registrar una sesión','body.zoomTo':'Acercar a este músculo',
'body.fullView':'Vista de cuerpo completo','body.tapHint':'Toca un grupo muscular para abrir su ficha',
'body.contributionNote':'Parte del trabajo de ese ejercicio que recae en este grupo muscular.',
'body.nodataNote':'Sin series registradas. Registra una sesión que trabaje este músculo para rellenar la ficha.',
'profile.language':'Idioma'
},
de:{
'body.close':'Schließen','body.train':'Einheit erfassen','body.zoomTo':'Auf diesen Muskel zoomen',
'body.fullView':'Ganzkörperansicht','body.tapHint':'Muskelgruppe antippen, um das Protokoll zu öffnen',
'body.contributionNote':'Anteil der Arbeit dieser Übung, der auf diese Muskelgruppe entfällt.',
'body.nodataNote':'Noch kein Satz erfasst. Erfasse eine Einheit für diesen Muskel, um das Protokoll zu füllen.',
'profile.language':'Sprache'
},
it:{
'body.close':'Chiudi','body.train':'Registra una sessione','body.zoomTo':'Zoom su questo muscolo',
'body.fullView':'Vista corpo intero','body.tapHint':'Tocca un gruppo muscolare per aprire la sua scheda',
'body.contributionNote':'Quota del lavoro di quell\'esercizio che ricade su questo gruppo muscolare.',
'body.nodataNote':'Nessuna serie registrata. Registra una sessione per questo muscolo per popolare la scheda.',
'profile.language':'Lingua'
},
nl:{
'body.close':'Sluiten','body.train':'Sessie registreren','body.zoomTo':'Zoomen op deze spier',
'body.fullView':'Volledig lichaam','body.tapHint':'Tik op een spiergroep om de kaart te openen',
'body.contributionNote':'Aandeel van het werk van die oefening dat op deze spiergroep valt.',
'body.nodataNote':'Nog geen set geregistreerd. Registreer een sessie voor deze spier om de kaart te vullen.',
'profile.language':'Taal'
}

};
Object.keys(TS3).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TS3[l]); });
