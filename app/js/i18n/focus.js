/* ============================================================================
   ANCESTOR — first-launch language + training focus strings

   Two additions, one file, because they are the two things a new user is asked
   before anything else: what language, and what the programme should emphasise.

   Every key here exists in all seven languages. The scan in tools/keyscan.js
   fails on a key that no language defines, and `coverage()` counts these keys
   because they are under the onb./profile./plan. prefixes — so an untranslated
   focus string would show up as a drop in the coverage the language screen
   itself prints. That is deliberate: the screen that claims a language is fully
   supported is measured by the same data it prints.
   ========================================================================== */

const TFOCUS = {};

TFOCUS.en = {
'lang.title':'Choose your language',
'lang.sub':'The interface and the printed sheet will be in this language. Where lesson text is only in English, the row says how much.',
'lang.note':'You can change this at any time in Profile, under Accessibility & display.',
'lang.continue':'Continue in English',
'lang.choose':'Choose',
'lang.coverageNote':'{p}% of this interface is translated.',
'lang.contentPct':'Lessons {p}%',
'lang.contentNote':'The interface is fully translated. {p}% of the lesson text, coaching cues and exercise names are; the rest stays in English, and each lesson says so at the top.',

'onb.focus.t':'Which areas do you want to prioritise?',
'onb.focus.d':'Pick any that matter to you. These shape how the programme is built — they never remove anything from it.',
'onb.focus.note':'Optional. Leave it untouched for a balanced plan.',

'onb.approach.t':'How should the programme lean?',
'onb.approach.d':'This decides which muscle gets the first movement of a session. Every option is open to you.',
'onb.approach.note':'You can change this later and rebuild the plan to apply it.',

'emphasis.balanced':'Balanced hypertrophy',
'emphasis.balanced.d':'Every muscle group gets the same share of the week.',
'emphasis.lower':'Lower-body emphasis',
'emphasis.lower.d':'Legs and glutes take the first movement of a session; the upper body keeps its place.',
'emphasis.upper':'Upper-body emphasis',
'emphasis.upper.d':'Chest, back and shoulders take the first movement; legs keep their day.',
'emphasis.glutes':'Glute emphasis',
'emphasis.glutes.d':'Hip movements lead the week, without adding extra weekly volume.',
'emphasis.custom':'Custom priorities',
'emphasis.custom.d':'Only the muscle groups you choose are favoured.',

'priority.quads':'Quads and thighs',
'priority.arms':'Arms',
'priority.core':'Core',
'priority.all':'Whole body, balanced',

'profile.explore':'Explore',
'profile.focus':'Training focus',
'profile.focusHint':'Applied when the programme is built. Nothing is removed — the favoured muscles get the first movement of a session, and at most two sessions a week gain one extra movement for them.',
'profile.focusOne':'1 priority area',
'profile.focusN':'{n} priority areas',
'focus.shortStale':'Not in this plan',
'profile.priorities':'Priority areas',
'profile.prioritiesHint':'Used by the custom option. Pick as many as you like.',
'focus.stale':'Your plan was built with a different focus. Rebuild it to apply the change — your logged sessions are not touched.',
'focus.rebuild':'Rebuild with the new focus',
'focus.saved':'Focus saved. The plan in hand is unchanged until you rebuild it.',
'focus.rebuilt':'Plan rebuilt with your new focus.',

'plan.focus':'Focus',
'plan.focusBalanced':'No single group is favoured — every session keeps its usual balance.',
'plan.focusLower':'{n} of {total} sessions now open with a leg movement.',
'plan.focusGlutes':'{n} of {total} sessions now open with a hip movement.',
'plan.focusUpper':'{n} of {total} sessions now open with a press or a pull.',
'plan.focusCustom':'Favouring: {list}.'
};

TFOCUS.fr = {
'lang.title':'Choisissez votre langue',
'lang.sub':'L\'interface et la fiche imprimée seront dans cette langue. Là où le texte des leçons n\'existe qu\'en anglais, la ligne indique dans quelle proportion.',
'lang.note':'Vous pouvez la changer à tout moment dans Profil, sous Accessibilité et affichage.',
'lang.continue':'Continuer en français',
'lang.choose':'Choisir',
'lang.coverageNote':'{p} % de cette interface est traduite.',
'lang.contentPct':'Leçons {p} %',
'lang.contentNote':'L\'interface est entièrement traduite. {p} % du texte des leçons, des consignes et des noms d\'exercices le sont aussi ; le reste est en anglais, et chaque leçon le signale en haut.',

'onb.focus.t':'Quelles zones voulez-vous prioriser ?',
'onb.focus.d':'Choisissez celles qui comptent pour vous. Elles orientent la construction du programme — elles n\'en retirent jamais rien.',
'onb.focus.note':'Facultatif. Laissez tel quel pour un programme équilibré.',

'onb.approach.t':'Quelle orientation pour le programme ?',
'onb.approach.d':'Cela détermine quel muscle reçoit le premier exercice d\'une séance. Toutes les options vous sont ouvertes.',
'onb.approach.note':'Modifiable plus tard, puis reconstruisez le programme pour l\'appliquer.',

'emphasis.balanced':'Hypertrophie équilibrée',
'emphasis.balanced.d':'Chaque groupe musculaire reçoit la même part de la semaine.',
'emphasis.lower':'Priorité au bas du corps',
'emphasis.lower.d':'Jambes et fessiers ouvrent la séance ; le haut du corps garde sa place.',
'emphasis.upper':'Priorité au haut du corps',
'emphasis.upper.d':'Pectoraux, dos et épaules ouvrent la séance ; les jambes gardent leur jour.',
'emphasis.glutes':'Priorité aux fessiers',
'emphasis.glutes.d':'Les mouvements de hanche mènent la semaine, sans volume hebdomadaire en plus.',
'emphasis.custom':'Priorités personnalisées',
'emphasis.custom.d':'Seuls les groupes que vous choisissez sont favorisés.',

'priority.quads':'Quadriceps et cuisses',
'priority.arms':'Bras',
'priority.core':'Sangle abdominale',
'priority.all':'Corps entier, équilibré',

'profile.explore':'Explorer',
'profile.focus':'Orientation du programme',
'profile.focusHint':'Appliquée à la construction du programme. Rien n\'est retiré : les muscles favorisés reçoivent le premier exercice d\'une séance, et deux séances par semaine au plus gagnent un exercice supplémentaire pour eux.',
'profile.focusOne':'1 zone prioritaire',
'profile.focusN':'{n} zones prioritaires',
'focus.shortStale':'Absent du programme',
'profile.priorities':'Zones prioritaires',
'profile.prioritiesHint':'Utilisé par l\'option personnalisée. Choisissez-en autant que vous voulez.',
'focus.stale':'Votre programme a été construit avec une autre orientation. Reconstruisez-le pour appliquer le changement — vos séances enregistrées ne sont pas modifiées.',
'focus.rebuild':'Reconstruire avec la nouvelle orientation',
'focus.saved':'Orientation enregistrée. Le programme actuel reste inchangé jusqu\'à sa reconstruction.',
'focus.rebuilt':'Programme reconstruit avec votre nouvelle orientation.',

'plan.focus':'Orientation',
'plan.focusBalanced':'Aucun groupe n\'est favorisé — chaque séance garde son équilibre habituel.',
'plan.focusLower':'{n} séances sur {total} ouvrent désormais sur un mouvement de jambes.',
'plan.focusGlutes':'{n} séances sur {total} ouvrent désormais sur un mouvement de hanche.',
'plan.focusUpper':'{n} séances sur {total} ouvrent désormais sur une poussée ou un tirage.',
'plan.focusCustom':'Favorise : {list}.'
};

TFOCUS.es = {
'lang.title':'Elige tu idioma',
'lang.sub':'La interfaz y la hoja impresa estarán en este idioma. Donde el texto de las lecciones solo existe en inglés, la fila lo indica.',
'lang.note':'Puedes cambiarlo cuando quieras en Perfil, en Accesibilidad y pantalla.',
'lang.continue':'Continuar en español',
'lang.choose':'Elegir',
'lang.coverageNote':'El {p} % de esta interfaz está traducido.',
'lang.contentPct':'Lecciones {p} %',
'lang.contentNote':'La interfaz está traducida por completo. También lo está el {p} % del texto de las lecciones, las indicaciones y los nombres de ejercicios; el resto permanece en inglés y cada lección lo dice al principio.',

'onb.focus.t':'¿Qué zonas quieres priorizar?',
'onb.focus.d':'Elige las que te importen. Orientan cómo se construye el programa: nunca le quitan nada.',
'onb.focus.note':'Opcional. Déjalo como está para un plan equilibrado.',

'onb.approach.t':'¿Hacia dónde debe inclinarse el programa?',
'onb.approach.d':'Decide qué músculo recibe el primer ejercicio de una sesión. Todas las opciones están disponibles para ti.',
'onb.approach.note':'Puedes cambiarlo más tarde y reconstruir el plan para aplicarlo.',

'emphasis.balanced':'Hipertrofia equilibrada',
'emphasis.balanced.d':'Cada grupo muscular recibe la misma parte de la semana.',
'emphasis.lower':'Énfasis en el tren inferior',
'emphasis.lower.d':'Piernas y glúteos abren la sesión; el tren superior conserva su lugar.',
'emphasis.upper':'Énfasis en el tren superior',
'emphasis.upper.d':'Pecho, espalda y hombros abren la sesión; las piernas conservan su día.',
'emphasis.glutes':'Énfasis en glúteos',
'emphasis.glutes.d':'Los movimientos de cadera lideran la semana, sin volumen semanal extra.',
'emphasis.custom':'Prioridades personalizadas',
'emphasis.custom.d':'Solo se favorecen los grupos que elijas.',

'priority.quads':'Cuádriceps y muslos',
'priority.arms':'Brazos',
'priority.core':'Core',
'priority.all':'Cuerpo completo, equilibrado',

'profile.explore':'Explorar',
'profile.focus':'Enfoque del entrenamiento',
'profile.focusHint':'Se aplica al construir el programa. No se quita nada: los músculos favorecidos reciben el primer ejercicio de una sesión y, como máximo, dos sesiones por semana ganan un ejercicio extra para ellos.',
'profile.focusOne':'1 zona prioritaria',
'profile.focusN':'{n} zonas prioritarias',
'focus.shortStale':'No está en el plan',
'profile.priorities':'Zonas prioritarias',
'profile.prioritiesHint':'Lo usa la opción personalizada. Elige tantas como quieras.',
'focus.stale':'Tu plan se construyó con otro enfoque. Reconstrúyelo para aplicar el cambio: tus sesiones registradas no se tocan.',
'focus.rebuild':'Reconstruir con el nuevo enfoque',
'focus.saved':'Enfoque guardado. El plan actual no cambia hasta que lo reconstruyas.',
'focus.rebuilt':'Plan reconstruido con tu nuevo enfoque.',

'plan.focus':'Enfoque',
'plan.focusBalanced':'Ningún grupo está favorecido: cada sesión mantiene su equilibrio habitual.',
'plan.focusLower':'{n} de {total} sesiones ahora abren con un movimiento de piernas.',
'plan.focusGlutes':'{n} de {total} sesiones ahora abren con un movimiento de cadera.',
'plan.focusUpper':'{n} de {total} sesiones ahora abren con un empuje o un tirón.',
'plan.focusCustom':'Favorece: {list}.'
};

TFOCUS.de = {
'lang.title':'Sprache wählen',
'lang.sub':'Oberfläche und gedrucktes Blatt erscheinen in dieser Sprache. Wo Lektionstexte nur auf Englisch vorliegen, steht es in der Zeile.',
'lang.note':'Du kannst sie jederzeit unter Profil → Bedienung & Darstellung ändern.',
'lang.continue':'Auf Deutsch fortfahren',
'lang.choose':'Wählen',
'lang.coverageNote':'{p} % dieser Oberfläche sind übersetzt.',
'lang.contentPct':'Lektionen {p} %',
'lang.contentNote':'Die Oberfläche ist vollständig übersetzt. Ebenso {p} % des Lektionstexts, der Hinweise und Übungsnamen; der Rest bleibt Englisch, und jede Lektion sagt das oben.',

'onb.focus.t':'Welche Bereiche möchtest du bevorzugen?',
'onb.focus.d':'Wähle, was dir wichtig ist. Das prägt den Aufbau des Programms — es entfernt nie etwas.',
'onb.focus.note':'Optional. Unverändert lassen für einen ausgewogenen Plan.',

'onb.approach.t':'Wohin soll das Programm neigen?',
'onb.approach.d':'Das entscheidet, welcher Muskel die erste Übung einer Einheit bekommt. Jede Option steht dir offen.',
'onb.approach.note':'Später änderbar — danach den Plan neu erstellen, um es anzuwenden.',

'emphasis.balanced':'Ausgewogene Hypertrophie',
'emphasis.balanced.d':'Jede Muskelgruppe bekommt denselben Anteil der Woche.',
'emphasis.lower':'Schwerpunkt Unterkörper',
'emphasis.lower.d':'Beine und Gesäß eröffnen die Einheit; der Oberkörper behält seinen Platz.',
'emphasis.upper':'Schwerpunkt Oberkörper',
'emphasis.upper.d':'Brust, Rücken und Schultern eröffnen die Einheit; die Beine behalten ihren Tag.',
'emphasis.glutes':'Schwerpunkt Gesäß',
'emphasis.glutes.d':'Hüftbewegungen führen die Woche an, ohne zusätzliches Wochenvolumen.',
'emphasis.custom':'Eigene Prioritäten',
'emphasis.custom.d':'Nur die gewählten Muskelgruppen werden bevorzugt.',

'priority.quads':'Quadrizeps und Oberschenkel',
'priority.arms':'Arme',
'priority.core':'Rumpf',
'priority.all':'Ganzkörper, ausgewogen',

'profile.explore':'Entdecken',
'profile.focus':'Trainingsschwerpunkt',
'profile.focusHint':'Wird beim Erstellen des Programms angewandt. Es wird nichts entfernt: bevorzugte Muskeln bekommen die erste Übung einer Einheit, und höchstens zwei Einheiten pro Woche erhalten eine Zusatzübung dafür.',
'profile.focusOne':'1 Prioritätsbereich',
'profile.focusN':'{n} Prioritätsbereiche',
'focus.shortStale':'Nicht im Plan',
'profile.priorities':'Prioritätsbereiche',
'profile.prioritiesHint':'Wird von der eigenen Option genutzt. Wähle so viele du möchtest.',
'focus.stale':'Dein Plan wurde mit einem anderen Schwerpunkt erstellt. Erstelle ihn neu, um die Änderung anzuwenden — deine protokollierten Einheiten bleiben unberührt.',
'focus.rebuild':'Mit neuem Schwerpunkt neu erstellen',
'focus.saved':'Schwerpunkt gespeichert. Der aktuelle Plan bleibt bis zum Neuerstellen unverändert.',
'focus.rebuilt':'Plan mit neuem Schwerpunkt neu erstellt.',

'plan.focus':'Schwerpunkt',
'plan.focusBalanced':'Keine Gruppe wird bevorzugt — jede Einheit behält ihre gewohnte Balance.',
'plan.focusLower':'{n} von {total} Einheiten beginnen jetzt mit einer Beinübung.',
'plan.focusGlutes':'{n} von {total} Einheiten beginnen jetzt mit einer Hüftübung.',
'plan.focusUpper':'{n} von {total} Einheiten beginnen jetzt mit einer Druck- oder Zugübung.',
'plan.focusCustom':'Bevorzugt: {list}.'
};

TFOCUS.it = {
'lang.title':'Scegli la lingua',
'lang.sub':'Interfaccia e scheda stampata saranno in questa lingua. Dove il testo delle lezioni esiste solo in inglese, la riga lo indica.',
'lang.note':'Puoi cambiarla quando vuoi in Profilo, sotto Accessibilità e display.',
'lang.continue':'Continua in italiano',
'lang.choose':'Scegli',
'lang.coverageNote':'Il {p}% di questa interfaccia è tradotto.',
'lang.contentPct':'Lezioni {p} %',
'lang.contentNote':'L\'interfaccia è tradotta del tutto. Lo è anche il {p} % del testo delle lezioni, delle indicazioni e dei nomi degli esercizi; il resto resta in inglese e ogni lezione lo dice in cima.',

'onb.focus.t':'Quali zone vuoi privilegiare?',
'onb.focus.d':'Scegli quelle che contano per te. Orientano la costruzione del programma — non tolgono mai nulla.',
'onb.focus.note':'Facoltativo. Lascia com\'è per un programma equilibrato.',

'onb.approach.t':'Verso cosa deve pendere il programma?',
'onb.approach.d':'Decide quale muscolo riceve il primo esercizio di una sessione. Ogni opzione è aperta a te.',
'onb.approach.note':'Puoi cambiarlo più avanti e ricostruire il piano per applicarlo.',

'emphasis.balanced':'Ipertrofia equilibrata',
'emphasis.balanced.d':'Ogni gruppo muscolare riceve la stessa parte della settimana.',
'emphasis.lower':'Enfasi sulla parte inferiore',
'emphasis.lower.d':'Gambe e glutei aprono la sessione; la parte superiore mantiene il suo posto.',
'emphasis.upper':'Enfasi sulla parte superiore',
'emphasis.upper.d':'Petto, schiena e spalle aprono la sessione; le gambe mantengono il loro giorno.',
'emphasis.glutes':'Enfasi sui glutei',
'emphasis.glutes.d':'I movimenti d\'anca guidano la settimana, senza volume settimanale in più.',
'emphasis.custom':'Priorità personalizzate',
'emphasis.custom.d':'Solo i gruppi che scegli vengono favoriti.',

'priority.quads':'Quadricipiti e cosce',
'priority.arms':'Braccia',
'priority.core':'Core',
'priority.all':'Corpo intero, equilibrato',

'profile.explore':'Esplora',
'profile.focus':'Enfasi dell\'allenamento',
'profile.focusHint':'Si applica quando il programma viene costruito. Non toglie nulla: i muscoli favoriti ricevono il primo esercizio di una sessione e al massimo due sessioni a settimana guadagnano un esercizio in più per loro.',
'profile.focusOne':'1 zona prioritaria',
'profile.focusN':'{n} zone prioritarie',
'focus.shortStale':'Non è nel programma',
'profile.priorities':'Zone prioritarie',
'profile.prioritiesHint':'Usato dall\'opzione personalizzata. Scegline quante vuoi.',
'focus.stale':'Il tuo piano è stato costruito con un\'altra enfasi. Ricostruiscilo per applicare la modifica — le sessioni registrate non vengono toccate.',
'focus.rebuild':'Ricostruisci con la nuova enfasi',
'focus.saved':'Enfasi salvata. Il piano attuale resta invariato finché non lo ricostruisci.',
'focus.rebuilt':'Piano ricostruito con la nuova enfasi.',

'plan.focus':'Enfasi',
'plan.focusBalanced':'Nessun gruppo è favorito — ogni sessione mantiene il suo equilibrio.',
'plan.focusLower':'{n} sessioni su {total} ora aprono con un movimento per le gambe.',
'plan.focusGlutes':'{n} sessioni su {total} ora aprono con un movimento d\'anca.',
'plan.focusUpper':'{n} sessioni su {total} ora aprono con una spinta o una trazione.',
'plan.focusCustom':'Favorisce: {list}.'
};

TFOCUS.nl = {
'lang.title':'Kies je taal',
'lang.sub':'De interface en het gedrukte blad zijn in deze taal. Waar lestekst alleen in het Engels bestaat, staat dat in de rij.',
'lang.note':'Je kunt dit altijd wijzigen in Profiel, onder Toegankelijkheid en weergave.',
'lang.continue':'Doorgaan in het Nederlands',
'lang.choose':'Kiezen',
'lang.coverageNote':'{p}% van deze interface is vertaald.',
'lang.contentPct':'Lessen {p}%',
'lang.contentNote':'De interface is volledig vertaald. Dat geldt ook voor {p}% van de lestekst, de aanwijzingen en de oefennamen; de rest blijft Engels, en elke les zegt dat bovenaan.',

'onb.focus.t':'Welke gebieden wil je voorrang geven?',
'onb.focus.d':'Kies wat voor jou telt. Het bepaalt hoe het programma wordt opgebouwd — het haalt er nooit iets uit.',
'onb.focus.note':'Optioneel. Laat staan voor een uitgebalanceerd plan.',

'onb.approach.t':'Waar moet het programma naartoe leunen?',
'onb.approach.d':'Dit bepaalt welke spier de eerste oefening van een sessie krijgt. Elke optie staat voor je open.',
'onb.approach.note':'Later aanpasbaar — bouw daarna het plan opnieuw om het toe te passen.',

'emphasis.balanced':'Gebalanceerde hypertrofie',
'emphasis.balanced.d':'Elke spiergroep krijgt hetzelfde deel van de week.',
'emphasis.lower':'Nadruk op onderlichaam',
'emphasis.lower.d':'Benen en billen openen de sessie; het bovenlichaam houdt zijn plek.',
'emphasis.upper':'Nadruk op bovenlichaam',
'emphasis.upper.d':'Borst, rug en schouders openen de sessie; de benen houden hun dag.',
'emphasis.glutes':'Nadruk op billen',
'emphasis.glutes.d':'Heupbewegingen leiden de week, zonder extra weekvolume.',
'emphasis.custom':'Eigen prioriteiten',
'emphasis.custom.d':'Alleen de spiergroepen die je kiest krijgen voorrang.',

'priority.quads':'Quadriceps en dijen',
'priority.arms':'Armen',
'priority.core':'Core',
'priority.all':'Heel lichaam, gebalanceerd',

'profile.explore':'Verkennen',
'profile.focus':'Trainingsfocus',
'profile.focusHint':'Wordt toegepast bij het bouwen van het programma. Er gaat niets af: de bevoorrechte spieren krijgen de eerste oefening van een sessie, en hooguit twee sessies per week krijgen één extra oefening daarvoor.',
'profile.focusOne':'1 prioriteitsgebied',
'profile.focusN':'{n} prioriteitsgebieden',
'focus.shortStale':'Niet in het plan',
'profile.priorities':'Prioriteitsgebieden',
'profile.prioritiesHint':'Gebruikt door de eigen optie. Kies er zoveel je wilt.',
'focus.stale':'Je plan is met een andere focus gebouwd. Bouw het opnieuw om de wijziging toe te passen — je geregistreerde sessies blijven ongewijzigd.',
'focus.rebuild':'Opnieuw bouwen met de nieuwe focus',
'focus.saved':'Focus opgeslagen. Het huidige plan blijft ongewijzigd tot je het opnieuw bouwt.',
'focus.rebuilt':'Plan opnieuw gebouwd met de nieuwe focus.',

'plan.focus':'Focus',
'plan.focusBalanced':'Geen enkele groep krijgt voorrang — elke sessie houdt zijn gewone balans.',
'plan.focusLower':'{n} van {total} sessies openen nu met een beenoefening.',
'plan.focusGlutes':'{n} van {total} sessies openen nu met een heupbeweging.',
'plan.focusUpper':'{n} van {total} sessies openen nu met een duw- of trekbeweging.',
'plan.focusCustom':'Voorrang voor: {list}.'
};

TFOCUS.ar = {
'lang.title':'اختر لغتك',
'lang.sub':'ستظهر الواجهة والورقة المطبوعة بهذه اللغة. وحيثما كان نص الدروس بالإنجليزية فقط، يبيّن السطر ذلك.',
'lang.note':'يمكنك تغييرها في أي وقت من الملف الشخصي، تحت إمكانية الوصول والعرض.',
'lang.continue':'المتابعة بالعربية',
'lang.choose':'اختيار',
'lang.coverageNote':'نسبة ترجمة هذه الواجهة {p}%.',
'lang.contentPct':'الدروس {p}%',
'lang.contentNote':'الواجهة مترجمة بالكامل. وكذلك {p}% من نص الدروس والإرشادات وأسماء التمارين؛ والباقي يبقى بالإنجليزية، وكل درس يذكر ذلك في أوله.',

'onb.focus.t':'أي المناطق تريد إعطاءها الأولوية؟',
'onb.focus.d':'اختر ما يهمّك. هذه الخيارات توجّه بناء البرنامج ولا تحذف منه شيئاً.',
'onb.focus.note':'اختياري. اتركه كما هو للحصول على برنامج متوازن.',

'onb.approach.t':'إلى أي جهة يميل البرنامج؟',
'onb.approach.d':'يحدّد هذا أي عضلة تحصل على التمرين الأول في الجلسة. كل الخيارات متاحة لك.',
'onb.approach.note':'يمكنك تغييره لاحقاً ثم إعادة بناء البرنامج لتطبيقه.',

'emphasis.balanced':'تضخيم متوازن',
'emphasis.balanced.d':'كل مجموعة عضلية تنال الحصة نفسها من الأسبوع.',
'emphasis.lower':'التركيز على الجزء السفلي',
'emphasis.lower.d':'الساقان والأرداف تفتتح الجلسة، ويحتفظ الجزء العلوي بمكانه.',
'emphasis.upper':'التركيز على الجزء العلوي',
'emphasis.upper.d':'الصدر والظهر والكتفان تفتتح الجلسة، وتحتفظ الساقان بيومهما.',
'emphasis.glutes':'التركيز على الأرداف',
'emphasis.glutes.d':'حركات الورك تقود الأسبوع، دون إضافة حجم أسبوعي زائد.',
'emphasis.custom':'أولويات مخصّصة',
'emphasis.custom.d':'تُفضَّل فقط المجموعات التي تختارها.',

'priority.quads':'الفخذ الأمامي',
'priority.arms':'الذراعان',
'priority.core':'الجذع',
'priority.all':'الجسم كله، متوازن',

'profile.explore':'استكشاف',
'profile.focus':'توجّه التدريب',
'profile.focusHint':'يُطبَّق عند بناء البرنامج. لا يُحذف شيء: العضلات المفضّلة تحصل على التمرين الأول في الجلسة، وجلستان أسبوعياً على الأكثر تحصلان على تمرين إضافي لها.',
'profile.focusOne':'منطقة أولوية واحدة',
'profile.focusN':'{n} مناطق أولوية',
'focus.shortStale':'غير موجود في البرنامج',
'profile.priorities':'المناطق ذات الأولوية',
'profile.prioritiesHint':'يستخدمه الخيار المخصّص. اختر ما تشاء منها.',
'focus.stale':'بُني برنامجك بتوجّه مختلف. أعد بناءه لتطبيق التغيير — جلساتك المسجّلة لن تُمسّ.',
'focus.rebuild':'إعادة البناء بالتوجّه الجديد',
'focus.saved':'حُفظ التوجّه. البرنامج الحالي يبقى كما هو حتى تعيد بناءه.',
'focus.rebuilt':'أُعيد بناء البرنامج بالتوجّه الجديد.',

'plan.focus':'التوجّه',
'plan.focusBalanced':'لا تُفضَّل أي مجموعة — كل جلسة تحتفظ بتوازنها المعتاد.',
'plan.focusLower':'{n} من {total} جلسات تبدأ الآن بحركة للساقين.',
'plan.focusGlutes':'{n} من {total} جلسات تبدأ الآن بحركة للورك.',
'plan.focusUpper':'{n} من {total} جلسات تبدأ الآن بحركة دفع أو سحب.',
'plan.focusCustom':'تفضيل: {list}.'
};

Object.keys(TFOCUS).forEach(l => { if(!T[l]) T[l] = {}; Object.assign(T[l], TFOCUS[l]); });

if (typeof module !== 'undefined' && module.exports) module.exports = { TFOCUS };
