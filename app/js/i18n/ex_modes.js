/* ============================================================================
   ANCESTOR — names & cues for the mode-aware exercises
   Added by js/data/exercises.js (timed holds, assisted, weighted bodyweight,
   loaded carry). Same key convention as the main library: ex.<id> / cue.<id>
   ========================================================================== */

const TM = {};

TM.en = {
'ex.plank':'Plank','cue.plank':'Body in one straight line from head to heels. Ribs down, glutes tight. Stop when the hips sag.',
'ex.side-plank':'Side Plank','cue.side-plank':'One forearm under the shoulder. Hips lifted. Do the same time on both sides.',
'ex.hollow-hold':'Hollow Body Hold','cue.hollow-hold':'Lower back pressed into the floor the whole time. If it lifts, the hold is over.',
'ex.wall-sit':'Wall Sit','cue.wall-sit':'Thighs parallel to the floor, back flat against the wall. Weight in the heels.',
'ex.assisted-pullup':'Assisted Pull-Up','cue.assisted-pullup':'The counterweight REMOVES weight. Less assistance is progress, not more.',
'ex.assisted-dip':'Assisted Dip','cue.assisted-dip':'The counterweight removes weight. Shoulders stay down. Stop before the front of the shoulder pinches.',
'ex.weighted-pullup':'Weighted Pull-Up','cue.weighted-pullup':'Weight is ADDED to your body. No swinging. Pull the elbows toward the hips.',
'ex.weighted-dip':'Weighted Dip','cue.weighted-dip':'Weight is added to your body. Lean slightly forward for chest. Stop before the shoulder pinches.',
'ex.farmer-carry':'Farmer Carry','cue.farmer-carry':'Tall posture, shoulders packed down. Walk, do not run. Grip failure ends the set.'
};

TM.fr = {
'ex.plank':'Gainage','cue.plank':'Corps aligné de la tête aux talons. Côtes baissées, fessiers serrés. Arrêtez quand les hanches s’affaissent.',
'ex.side-plank':'Gainage latéral','cue.side-plank':'Un avant-bras sous l’épaule. Hanches soulevées. Même durée des deux côtés.',
'ex.hollow-hold':'Gainage creux','cue.hollow-hold':'Le bas du dos reste collé au sol. S’il se décolle, la série est finie.',
'ex.wall-sit':'Chaise au mur','cue.wall-sit':'Cuisses parallèles au sol, dos plaqué au mur. Poids dans les talons.',
'ex.assisted-pullup':'Traction assistée','cue.assisted-pullup':'Le contrepoids RETIRE du poids. Moins d’assistance = une progression, pas plus.',
'ex.assisted-dip':'Dips assistés','cue.assisted-dip':'Le contrepoids retire du poids. Épaules basses. Arrêtez avant que l’avant de l’épaule pince.',
'ex.weighted-pullup':'Traction lestée','cue.weighted-pullup':'La charge s’AJOUTE à votre corps. Pas d’élan. Tirez les coudes vers les hanches.',
'ex.weighted-dip':'Dips lestés','cue.weighted-dip':'La charge s’ajoute à votre corps. Penchez légèrement en avant pour les pectoraux.',
'ex.farmer-carry':'Marche du fermier','cue.farmer-carry':'Posture droite, épaules basses. Marchez, ne courez pas. La prise lâche : fin de la série.'
};

TM.es = {
'ex.plank':'Plancha','cue.plank':'Cuerpo alineado de la cabeza a los talones. Costillas abajo, glúteos firmes. Para cuando las caderas caigan.',
'ex.side-plank':'Plancha lateral','cue.side-plank':'Un antebrazo bajo el hombro. Caderas elevadas. El mismo tiempo en ambos lados.',
'ex.hollow-hold':'Hollow hold','cue.hollow-hold':'La zona lumbar pegada al suelo todo el tiempo. Si se despega, la serie termina.',
'ex.wall-sit':'Sentadilla en la pared','cue.wall-sit':'Muslos paralelos al suelo, espalda apoyada. Peso en los talones.',
'ex.assisted-pullup':'Dominada asistida','cue.assisted-pullup':'El contrapeso QUITA peso. Menos asistencia es progresar, no más.',
'ex.assisted-dip':'Fondos asistidos','cue.assisted-dip':'El contrapeso quita peso. Hombros abajo. Para antes de que moleste el hombro.',
'ex.weighted-pullup':'Dominada lastrada','cue.weighted-pullup':'La carga se AÑADE a tu cuerpo. Sin balanceo. Lleva los codos hacia las caderas.',
'ex.weighted-dip':'Fondos lastrados','cue.weighted-dip':'La carga se añade a tu cuerpo. Inclínate ligeramente hacia delante para el pecho.',
'ex.farmer-carry':'Paseo del granjero','cue.farmer-carry':'Postura erguida, hombros abajo. Camina, no corras. Si falla el agarre, termina la serie.'
};

TM.de = {
'ex.plank':'Unterarmstütz','cue.plank':'Körper in einer Linie von Kopf bis Fersen. Rippen runter, Gesäß fest. Stopp, sobald die Hüfte absinkt.',
'ex.side-plank':'Seitstütz','cue.side-plank':'Ein Unterarm unter der Schulter. Hüfte gehoben. Beide Seiten gleich lang.',
'ex.hollow-hold':'Hollow Hold','cue.hollow-hold':'Der untere Rücken bleibt die ganze Zeit am Boden. Löst er sich, ist der Satz vorbei.',
'ex.wall-sit':'Wandsitz','cue.wall-sit':'Oberschenkel parallel zum Boden, Rücken flach an der Wand. Gewicht auf den Fersen.',
'ex.assisted-pullup':'Klimmzug mit Unterstützung','cue.assisted-pullup':'Das Gegengewicht NIMMT Gewicht weg. Weniger Unterstützung ist Fortschritt, nicht mehr.',
'ex.assisted-dip':'Dips mit Unterstützung','cue.assisted-dip':'Das Gegengewicht nimmt Gewicht weg. Schultern unten. Stopp bevor die Schulter vorne zwickt.',
'ex.weighted-pullup':'Klimmzug mit Zusatzgewicht','cue.weighted-pullup':'Das Gewicht wird zum Körper HINZUGEFÜGT. Kein Schwung. Ellbogen zu den Hüften.',
'ex.weighted-dip':'Dips mit Zusatzgewicht','cue.weighted-dip':'Das Gewicht wird zum Körper hinzugefügt. Leicht vorneigen für die Brust.',
'ex.farmer-carry':'Farmer’s Walk','cue.farmer-carry':'Aufrecht, Schultern unten. Gehen, nicht laufen. Wenn der Griff versagt, endet der Satz.'
};

TM.it = {
'ex.plank':'Plank','cue.plank':'Corpo in linea da testa a talloni. Coste giù, glutei contratti. Fermati quando i fianchi cedono.',
'ex.side-plank':'Plank laterale','cue.side-plank':'Un avambraccio sotto la spalla. Anche sollevate. Stesso tempo su entrambi i lati.',
'ex.hollow-hold':'Hollow hold','cue.hollow-hold':'La bassa schiena resta a terra per tutto il tempo. Se si stacca, la serie è finita.',
'ex.wall-sit':'Sedia al muro','cue.wall-sit':'Cosce parallele al pavimento, schiena al muro. Peso sui talloni.',
'ex.assisted-pullup':'Trazioni assistite','cue.assisted-pullup':'Il contrappeso TOGLIE peso. Meno assistenza è un progresso, non di più.',
'ex.assisted-dip':'Dip assistiti','cue.assisted-dip':'Il contrappeso toglie peso. Spalle basse. Fermati prima che la spalla pizzichi.',
'ex.weighted-pullup':'Trazioni zavorrate','cue.weighted-pullup':'Il carico si AGGIUNGE al corpo. Nessuno slancio. Gomiti verso le anche.',
'ex.weighted-dip':'Dip zavorrati','cue.weighted-dip':'Il carico si aggiunge al corpo. Piegati leggermente in avanti per il petto.',
'ex.farmer-carry':'Farmer walk','cue.farmer-carry':'Postura eretta, spalle basse. Cammina, non correre. Se la presa cede, la serie finisce.'
};

TM.nl = {
'ex.plank':'Plank','cue.plank':'Lichaam in één rechte lijn van hoofd tot hielen. Ribben naar beneden, bilspieren aan. Stop als de heupen zakken.',
'ex.side-plank':'Zijwaartse plank','cue.side-plank':'Één onderarm onder de schouder. Heupen omhoog. Even lang aan beide kanten.',
'ex.hollow-hold':'Hollow hold','cue.hollow-hold':'Onderrug blijft de hele tijd op de grond. Komt hij los, dan is de set voorbij.',
'ex.wall-sit':'Muurzit','cue.wall-sit':'Bovenbenen evenwijdig aan de vloer, rug plat tegen de muur. Gewicht op de hielen.',
'ex.assisted-pullup':'Optrekken met hulp','cue.assisted-pullup':'Het contragewicht HAALT gewicht weg. Minder hulp is vooruitgang, niet meer.',
'ex.assisted-dip':'Dips met hulp','cue.assisted-dip':'Het contragewicht haalt gewicht weg. Schouders laag. Stop voordat de schouder knijpt.',
'ex.weighted-pullup':'Optrekken met gewicht','cue.weighted-pullup':'Het gewicht wordt aan je lichaam TOEGEVOEGD. Niet zwaaien. Elleboog naar de heupen.',
'ex.weighted-dip':'Dips met gewicht','cue.weighted-dip':'Het gewicht wordt aan je lichaam toegevoegd. Leun licht voorover voor de borst.',
'ex.farmer-carry':'Boerenwandeling','cue.farmer-carry':'Rechtop, schouders laag. Wandelen, niet rennen. Als de grip faalt, eindigt de set.'
};

TM.ar = {
'ex.plank':'بلانك','cue.plank':'الجسم خط مستقيم من الرأس إلى الكعبين. الأضلاع للأسفل والأرداف مشدودة. توقّف عند هبوط الوركين.',
'ex.side-plank':'بلانك جانبي','cue.side-plank':'ساعد واحد تحت الكتف. الوركان مرفوعان. نفس المدة على الجانبين.',
'ex.hollow-hold':'ثبات الجوف','cue.hollow-hold':'أسفل الظهر يبقى ملتصقاً بالأرض طوال الوقت. إذا ارتفع تنتهي المجموعة.',
'ex.wall-sit':'الجلوس على الحائط','cue.wall-sit':'الفخذان بموازاة الأرض والظهر مسطوح على الحائط. الوزن على الكعبين.',
'ex.assisted-pullup':'عقلة بمساعدة','cue.assisted-pullup':'الثقل الموازن يزيل وزناً. تقليل المساعدة هو التقدّم، لا زيادتها.',
'ex.assisted-dip':'دبس بمساعدة','cue.assisted-dip':'الثقل الموازن يزيل وزناً. الكتفان للأسفل. توقّف قبل أن يؤلم الكتف.',
'ex.weighted-pullup':'عقلة بأوزان','cue.weighted-pullup':'الوزن يُضاف إلى جسمك. بلا تأرجح. اسحب المرفقين نحو الوركين.',
'ex.weighted-dip':'دبس بأوزان','cue.weighted-dip':'الوزن يُضاف إلى جسمك. مل خفيفاً للأمام للصدر.',
'ex.farmer-carry':'مشية الفلاح','cue.farmer-carry':'وقفة معتدلة والكتفان للأسفل. امشِ ولا تركض. إذا فشلت القبضة تنتهي المجموعة.'
};

Object.keys(TM).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TM[l]); });

