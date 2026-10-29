/* ============================================================================
   ANCESTOR — lesson bodies in Spanish and German

   Full section text for all 42 lesson sections. English remains the source
   (lesson_bodies_en.js); French is complete (lesson_bodies_fr.js). Languages
   without a body file fall back to English and the lesson page says so.
   ========================================================================== */

const TLES = {};
TLES.es = {
/* muscle-growth */
'sec.muscle-growth.1.h':'Qué cambia realmente',
'sec.muscle-growth.1.b':'El entrenamiento de fuerza desafía repetidamente a un músculo a producir fuerza. En semanas, las fibras pueden aumentar su contenido de proteína contráctil, así que el área de sección crece. Eso es la hipertrofia. Es un cambio estructural lento y acumulativo, no algo que aparece tras una sesión dura.',
'sec.muscle-growth.2.h':'Un modelo simplificado, claramente identificado',
'sec.muscle-growth.2.b':'Un modelo docente habitual tiene tres pasos: una sesión crea un estímulo; la síntesis de proteína muscular sube durante alrededor de uno o dos días; si la recuperación y la nutrición lo permiten, se retiene una pequeña cantidad neta de proteína. Repite eso cientos de veces y el cambio se vuelve medible. El modelo es útil y también simplificado: los trabajos a nivel tisular describen múltiples señales en interacción.',
'sec.muscle-growth.3.h':'La tensión, y lo que sigue en debate',
'sec.muscle-growth.3.b':'La tensión mecánica se trata como el estímulo central. La acumulación metabólica y el daño inducido por el ejercicio se discuten a menudo como contribuyentes adicionales, pero su aporte independiente al crecimiento a largo plazo está menos establecido. Las revisiones de los mecanismos de detección subrayan que el cuadro no se reduce a una vía única.',
'sec.muscle-growth.4.h':'La hinchazón no es crecimiento',
'sec.muscle-growth.4.b':'Tras un entrenamiento inhabitual o muy dañino, el agua y la actividad inflamatoria pueden hacer que un músculo se sienta y se mida más grande durante días. Eso no es tejido contráctil nuevo. Por eso una tendencia de semanas es significativa y una lectura aislada no lo es.',
'sec.muscle-growth.5.h':'Lo que ANCESTOR puede y no puede decirte',
'sec.muscle-growth.5.b':'ANCESTOR registra cargas, repeticiones, series y esfuerzo entre sesiones. No mide el tamaño muscular. Cualquier afirmación sobre crecimiento en esta aplicación es una inferencia a partir de tendencias de rendimiento, no una medición de tu tejido.',
/* energy-fat */
'sec.energy-fat.1.h':'El balance energético, enunciado con cuidado',
'sec.energy-fat.1.b':'Las reservas de energía cambian cuando la ingesta y el gasto difieren en el tiempo. Esa afirmación es cierta y también menos predictiva de lo que parece, porque ambos lados se adaptan: el apetito, la actividad espontánea y la tasa metabólica responden al cambio sostenido.',
'sec.energy-fat.2.h':'La regla aproximada de las 7.700 kcal por kilo',
'sec.energy-fat.2.b':'Verás que un déficit de 7.700 kcal equivale a 1 kg de grasa. Tómalo solo como punto de partida aproximado. El tejido adiposo no es lípido puro, y el cuerpo se adapta durante el cambio sostenido, así que la cifra real se desplaza. Los modelos que lo tienen en cuenta superan a las reglas fijas, y por eso aquí ninguna calculadora proyecta tu composición corporal.',
'sec.energy-fat.3.h':'Quemar grasa en la sesión no es perder grasa',
'sec.energy-fat.3.b':'La mezcla de combustible usada depende de la intensidad, la duración y la ingesta reciente. Entrenar en un estado que quema mayor proporción de grasa no produce por sí mismo más pérdida de grasa: lo que importa es el balance sostenido durante semanas.',
'sec.energy-fat.4.h':'La reducción localizada no está respaldada',
'sec.energy-fat.4.b':'Entrenar un músculo no elimina selectivamente la grasa que lo cubre. La grasa cambia sistémicamente con el tiempo, y de dónde sale primero varía entre personas por razones que esta aplicación no puede evaluar.',
'sec.energy-fat.5.h':'Qué hace ANCESTOR con esto',
'sec.energy-fat.5.b':'ANCESTOR registra trabajo mecánico: cargas, repeticiones y series. No estima calorías quemadas, no estima grasa corporal y no proyecta la composición corporal. Si ves un número aquí, es un valor de entrenamiento registrado, no una medición metabólica.',
/* strength-power */
'sec.strength-power.1.h':'La fuerza es específica',
'sec.strength-power.1.b':'La fuerza es la capacidad de producir fuerza en una tarea definida. Mejorar en un movimiento te hace específicamente mejor en ese movimiento: parte se transfiere, mucho no. Por eso la aplicación te compara con tu propio historial en el mismo ejercicio, nunca con otra persona.',
'sec.strength-power.2.h':'Las ganancias tempranas son sobre todo neurales',
'sec.strength-power.2.b':'En las primeras semanas se gana fuerza más rápido de lo que el músculo cambia visiblemente. Mejor coordinación, reclutamiento de unidades motoras y menor inhibición explican gran parte de esa subida inicial. El cambio estructural se acumula más despacio encima.',
'sec.strength-power.3.h':'Carga, repeticiones y qué favorece cada una',
'sec.strength-power.3.b':'Las cargas pesadas tienden a dar mayores ganancias en pruebas de fuerza máxima; un amplio rango de cargas puede dar hipertrofia similar cuando las series van cerca del fallo. Así que el rango de repeticiones sigue tu objetivo elegido, no la creencia de que solo un rango funciona.',
'sec.strength-power.4.h':'El 1RM estimado es una estimación',
'sec.strength-power.4.b':'ANCESTOR muestra un máximo estimado de una repetición, derivado de tus cargas y repeticiones. Es una comodidad de modelado para seguir tendencias, no un máximo testado. No lo uses para elegir un intento de competición.',
/* movement-mechanics */
'sec.movement-mechanics.1.h':'Articulaciones, palancas y brazos de momento',
'sec.movement-mechanics.1.b':'Un movimiento lo producen músculos que tiran de huesos a través de articulaciones. El par que un músculo debe producir depende de la carga y del brazo de momento, la distancia perpendicular entre la articulación y la línea de la carga. Cambia la postura o el rango y cambias la demanda: por eso el mismo peso puede sentirse distinto en otra posición.',
'sec.movement-mechanics.2.h':'Implicación primaria y secundaria',
'sec.movement-mechanics.2.b':'La mayoría de ejercicios reparten el trabajo entre varios grupos musculares. El músculo que hace la mayor parte es el motor primario; otros asisten o estabilizan. ANCESTOR asigna a cada ejercicio unos pesos de contribución que representan ese reparto. Son una simplificación para la contabilidad del volumen: no son electromiografía.',
'sec.movement-mechanics.3.h':'El rango de movimiento es una variable de entrenamiento',
'sec.movement-mechanics.3.b':'Trabajar con mayor rango suele significar producir fuerza a longitudes musculares mayores y en posiciones articulares más débiles. Un rango reducido permite usar más carga. Ninguno es universalmente mejor: la elección depende del objetivo, la articulación y la persona.',
'sec.movement-mechanics.4.h':'La técnica no se verifica aquí',
'sec.movement-mechanics.4.b':'ANCESTOR no te ve. Registra lo que levantaste y lo que declaraste. Nunca afirma haber evaluado tu técnica, y las reglas de progresión tratan la consistencia técnica como tu propio juicio, no como un valor medido.',
/* cardio-health */
'sec.cardio-health.1.h':'Más de un tipo de forma física',
'sec.cardio-health.1.b':'El entrenamiento de fuerza construye fuerza y músculo. La actividad aeróbica apoya la salud cardiovascular y metabólica. El trabajo de flexibilidad y neuromotor apoya el rango y el control. Son cualidades distintas y coexisten: perseguir una no vuelve a las otras opcionales.',
'sec.cardio-health.2.h':'Guía general de actividad',
'sec.cardio-health.2.b':'Las grandes posiciones oficiales resumen rangos de dosis semanal para actividad aeróbica y de fuerza en adultos aparentemente sanos. Son puntos de partida poblacionales a adaptar a la capacidad y las circunstancias, no prescripciones para una persona con una condición médica.',
'sec.cardio-health.3.h':'Lo que esta aplicación no es',
'sec.cardio-health.3.b':'ANCESTOR no es un dispositivo médico y no da diagnósticos. Si tienes una condición de salud, estás embarazada, o tienes síntomas como dolor en el pecho, falta de aire inusual o desmayos, busca consejo profesional antes de cambiar tu entrenamiento.',
/* sleep-recovery */
'sec.sleep-recovery.1.h':'El sueño se declara, no se mide',
'sec.sleep-recovery.1.b':'Si registras sueño, ANCESTOR usa las horas que introdujiste y nada más. No hay conexión con dispositivos ni medición fisiológica. Todo lo que sigue hereda esa limitación.',
'sec.sleep-recovery.2.h':'Por qué la aplicación pregunta cuándo duermes',
'sec.sleep-recovery.2.b':'Los trabajadores nocturnos duermen de día. Una aplicación que asumiera que el sueño ocurre de noche clasificaría mal su descanso. ANCESTOR ancla el día biológico en tu hora habitual de despertar, así que el sueño diurno se trata como normal en lugar de como un error.',
'sec.sleep-recovery.3.h':'Cómo se construye la estimación',
'sec.sleep-recovery.3.b':'Un valor por defecto por músculo se escala por el trabajo realizado, el nivel de esfuerzo, el estilo de entrenamiento, la experiencia, el sueño declarado, las agujetas y el estado articular declarados, y la tendencia de rendimiento. Un multiplicador aprendido y acotado se ajusta despacio desde tus propios resultados. La salida es una estimación con factores visibles, allí donde aparece el número.',
'sec.sleep-recovery.4.h':'Lo que deliberadamente no afirma',
'sec.sleep-recovery.4.b':'Ningún nivel hormonal, ningún diagnóstico de sobreentrenamiento, ninguna detección de lesiones, y ninguna afirmación de que un músculo se ha recuperado. Dolor persistente, enfermedad o pérdida de rendimiento inexplicada merecen valoración profesional, no una carga menor.',
/* nutrition */
'sec.nutrition.1.h':'Proteína, en términos generales',
'sec.nutrition.1.b':'El entrenamiento de fuerza eleva las necesidades de proteína respecto a las guías para sedentarios. Los trabajos metaanalíticos sugieren que el beneficio se estabiliza para la mayoría en ingestas bien por encima del mínimo recomendado, con la edad y el nivel de entrenamiento moviendo el cuadro. Son patrones generales, no un objetivo calculado para ti.',
'sec.nutrition.2.h':'El momento es menos dramático de lo que se vende',
'sec.nutrition.2.b':'La ventana anabólica es más amplia de lo que sugiere el marketing de suplementos. Para la mayoría, la ingesta diaria total importa más que acertar un minuto concreto tras la sesión.',
'sec.nutrition.3.h':'Esta aplicación no calcula tu dieta',
'sec.nutrition.3.b':'ANCESTOR no sigue alimentos, no estima tu gasto energético y no genera prescripción nutricional. Si habla de proteína, es educación, no un consejo sobre tu cuerpo.',
/* aging-mobility */
'sec.aging-mobility.1.h':'La capacidad cambia, la entrenabilidad no desaparece',
'sec.aging-mobility.1.b':'La fuerza, la potencia y el equilibrio bajan en promedio con la edad, pero el entrenamiento de fuerza sigue siendo eficaz a lo largo de la vida. Lo que cambia es la dosis, la selección de ejercicios y el margen de recuperación; no si el entrenamiento funciona.',
'sec.aging-mobility.2.h':'La función es un objetivo legítimo',
'sec.aging-mobility.2.b':'Levantarse de una silla, cargar peso, subir escaleras y recuperarse de un tropezón son resultados entrenables. ANCESTOR apoya objetivos funcionales y de movilidad junto a la hipertrofia precisamente por esto.',
'sec.aging-mobility.3.h':'La adaptación es individual, no diagnóstica',
'sec.aging-mobility.3.b':'Las opciones en sedestación, las compatibles con silla de ruedas, las de bajo impacto y el trabajo de movilidad son adaptaciones que eliges. No son una afirmación sobre tu diagnóstico, y ninguna adaptación sirve a todas las personas con la misma etiqueta. Cuando el juicio clínico es relevante, la aplicación lo dice.',
/* training-principles */
'sec.training-principles.1.h':'Sobrecarga progresiva, definida',
'sec.training-principles.1.b':'Para seguir adaptándose, la demanda debe aumentar con el tiempo. Ese aumento puede venir de la carga, las repeticiones, las series, el rango, el control o menos descanso; no solo de añadir discos. La progresión se gana con el rendimiento, no se concede por el tiempo transcurrido.',
'sec.training-principles.2.h':'Por qué ANCESTOR no añade peso por calendario',
'sec.training-principles.2.b':'Una regla que dijera pasaron dos semanas, suma 2,5 kg ignora si alcanzaste el objetivo. ANCESTOR sube la carga solo cuando cada serie prescrita llega a la parte alta del rango de repeticiones con el esfuerzo previsto. Si la evidencia no está, la carga se mantiene; si el rendimiento baja dos veces seguidas, retrocede.',
'sec.training-principles.3.h':'El volumen es una variable con contrapartidas',
'sec.training-principles.3.b':'Volúmenes semanales más altos se asocian con mayor hipertrofia media, con rendimientos decrecientes y un coste de recuperación creciente. ANCESTOR sigue las series semanales por grupo muscular para que los cambios sean visibles y revisables; no declara un óptimo por ti.',
'sec.training-principles.4.h':'La adherencia domina',
'sec.training-principles.4.b':'El mejor programa es el que se sostiene el tiempo suficiente para importar. Por eso ANCESTOR trata las sesiones perdidas como información y no como fracaso, y por eso la constancia es un objetivo seleccionable.',
/* scientific-literacy */
'sec.scientific-literacy.1.h':'No toda la evidencia vale lo mismo',
'sec.scientific-literacy.1.b':'Las revisiones sistemáticas y los metaanálisis están por encima de los ensayos individuales para la mayoría de preguntas prácticas; los ensayos bien diseñados por encima del trabajo observacional; el razonamiento mecanicista y la opinión de expertos por debajo. La actualidad no es calidad: un estudio nuevo no supera a un cuerpo de trabajo bien asentado.',
'sec.scientific-literacy.2.h':'Por qué un estudio aislado rara vez cambia una recomendación',
'sec.scientific-literacy.2.b':'Con análisis flexibles, muestras pequeñas y presión por publicar, cualquier resultado aislado puede ser frágil. ANCESTOR exige que una fuente esté revisada y tenga calidad utilizable antes de afectar a una regla visible para el usuario. Nada se despliega directamente desde la literatura.',
'sec.scientific-literacy.3.h':'La IA no es una fuente',
'sec.scientific-literacy.3.b':'Las explicaciones de esta aplicación están escritas para ser trazables. Cada afirmación de investigación enlaza a una ficha de evidencia con título, autores, año e identificador cuando está disponible. Una frase generada por IA nunca se trata como una cita.',
'sec.scientific-literacy.4.h':'Correlación, causalidad y tú',
'sec.scientific-literacy.4.b':'Las estimaciones de recuperación de ANCESTOR se asocian con tu historial registrado; no son causas demostradas de tu próxima actuación. La aplicación separa observaciones de interpretaciones y dice cuál es cuál.',
/* misconceptions */
'sec.misconceptions.1.h':'Un paseo breve por la certeza equivocada',
'sec.misconceptions.1.b':'La cultura del fitness está llena de afirmaciones dichas con total seguridad y apoyo escaso: que el bombeo causa crecimiento, que las agujetas prueban eficacia, que una ventana estrecha tras entrenar decide tus resultados, que ejercitar un músculo quema la grasa encima, que un estudio nuevo tumba décadas de trabajo. Cada una tiene un veredicto claro en la evidencia.',
'sec.misconceptions.2.h':'Por qué persisten los mitos',
'sec.misconceptions.2.b':'Son simples, accionables y repetidos por gente con incentivos comerciales. Que una afirmación sea popular no es prueba de que sea verdad; y que un suplemento sea legal no es prueba de que funcione.',
'sec.misconceptions.3.h':'El hábito que vale la pena',
'sec.misconceptions.3.b':'Pregunta qué te haría cambiar de opinión. Si una afirmación no trae medición, ni grupo de comparación, ni mecanismo, no es un resultado: es un cuento.'
};

const TLDE = {};
TLDE.de = {
/* muscle-growth */
'sec.muscle-growth.1.h':'Was sich tatsächlich ändert',
'sec.muscle-growth.1.b':'Krafttraining fordert einen Muskel wiederholt, Kraft zu erzeugen. Über Wochen können die Fasern ihren Gehalt an kontraktilem Protein erhöhen, sodass die Querschnittsfläche wächst. Das ist Hypertrophie. Es ist eine langsame, kumulative strukturelle Veränderung, nichts, was nach einer harten Einheit entsteht.',
'sec.muscle-growth.2.h':'Ein vereinfachtes Modell, klar als solches gekennzeichnet',
'sec.muscle-growth.2.b':'Ein gängiges Lehrmodell hat drei Schritte: Eine Einheit setzt einen Reiz; die Muskelproteinsynthese steigt für etwa ein bis zwei Tage; wenn Erholung und Ernährung es tragen, wird eine kleine Menge Netto-Protein eingebaut. Wiederhole das hunderte Male, wird die Veränderung messbar. Das Modell ist nützlich und zugleich vereinfacht. Arbeiten auf Gewebeebene beschreiben mehrere zusammenwirkende Signale.',
'sec.muscle-growth.3.h':'Spannung, und was weiterhin umstritten ist',
'sec.muscle-growth.3.b':'Die mechanische Spannung gilt als zentraler Reiz. Metabolische Akkumulation und trainingsbedingte Schädigung werden oft als zusätzliche Beiträge diskutiert, ihr eigenständiger Beitrag zum langfristigen Wachstum ist weniger geklärt. Übersichtsarbeiten betonen ausdrücklich, dass das Bild kein einzelner Pfad ist.',
'sec.muscle-growth.4.h':'Schwellung ist kein Wachstum',
'sec.muscle-growth.4.b':'Nach ungewohntem oder sehr stark schädigendem Training können Wasser und Entzündungsaktivität einen Muskel tagelang größer wirken und messen lassen. Das ist kein neues kontraktiles Gewebe. Deshalb ist ein Trend über Wochen aussagekräftig und ein Einzelwert nicht.',
'sec.muscle-growth.5.h':'Was ANCESTOR sagen kann und was nicht',
'sec.muscle-growth.5.b':'ANCESTOR erfasst Lasten, Wiederholungen, Sätze und Anstrengung über Einheiten hinweg. Es misst keine Muskelgröße. Jede Aussage über Wachstum in dieser App ist eine Ableitung aus Leistungstrends, keine Messung deines Gewebes.',
/* energy-fat */
'sec.energy-fat.1.h':'Energiebilanz, vorsichtig formuliert',
'sec.energy-fat.1.b':'Körperenergiespeicher ändern sich, wenn Aufnahme und Verbrauch sich über die Zeit unterscheiden. Diese Aussage ist wahr und zugleich weniger vorhersagend, als sie klingt, weil beide Seiten sich anpassen: Appetit, spontane Aktivität und Stoffwechselrate reagieren auf anhaltende Veränderung.',
'sec.energy-fat.2.h':'Die Faustregel 7.700 kcal pro Kilogramm',
'sec.energy-fat.2.b':'Man liest, ein Defizit von 7.700 kcal entspreche 1 kg Fett. Behandle das nur als groben Ausgangspunkt. Fettgewebe ist kein reines Lipid, und der Körper passt sich während anhaltender Veränderung an, also verschiebt sich der reale Wert. Modelle, die das berücksichtigen, schlagen feste Regeln. Deshalb projiziert kein Rechner hier deine Körperzusammensetzung.',
'sec.energy-fat.3.h':'Während der Einheit Fett verbrennen ist nicht Fett verlieren',
'sec.energy-fat.3.b':'Welcher Brennstoffmix genutzt wird, hängt von Intensität, Dauer und jüngster Aufnahme ab. In einem Zustand zu trainieren, der anteilig mehr Fett verbrennt, erzeugt für sich allein keinen größeren Fettverlust. Entscheidend ist die über Wochen gehaltene Bilanz.',
'sec.energy-fat.4.h':'Punktuelle Fettreduktion ist nicht belegt',
'sec.energy-fat.4.b':'Einen Muskel zu trainieren entfernt nicht selektiv das Fett darüber. Fett verändert sich systemisch über die Zeit, und wo es zuerst verschwindet, variiert zwischen Menschen aus Gründen, die diese App nicht bewerten kann.',
'sec.energy-fat.5.h':'Was ANCESTOR daraus macht',
'sec.energy-fat.5.b':'ANCESTOR erfasst mechanische Arbeit: Lasten, Wiederholungen und Sätze. Es schätzt keine verbrannten Kalorien, kein Körperfett, keine Körperzusammensetzung. Wenn du hier eine Zahl siehst, ist das ein erfasster Trainingswert, keine Stoffwechselmessung.',
/* strength-power */
'sec.strength-power.1.h':'Kraft ist spezifisch',
'sec.strength-power.1.b':'Kraft ist die Fähigkeit, in einer definierten Aufgabe Kraft zu erzeugen. Besser in einer Bewegung zu werden macht dich spezifisch in dieser Bewegung besser. Manches überträgt sich, vieles nicht. Deshalb vergleicht dich die App mit deiner eigenen Historie beim gleichen Exercise, nie mit einer anderen Person.',
'sec.strength-power.2.h':'Frühe Zuwächse sind weitgehend neural',
'sec.strength-power.2.b':'In den ersten Wochen werden Menschen oft schneller stärker, als sich der Muskel sichtbar verändert. Bessere Koordination, Rekrutierung motorischer Einheiten und geringere Hemmung erklären viel von diesem frühen Anstieg. Der strukturelle Umbau baut sich langsamer darauf auf.',
'sec.strength-power.3.h':'Last, Wiederholungen und was jeweils begünstigt wird',
'sec.strength-power.3.b':'Schwere Lasten bringen tendenziell größere Zuwächse in Maximalkrafttests. Ein breites Lastspektrum kann bei satznaher Ausbelastung ähnliche Hypertrophie erzeugen. Deshalb folgt der Wiederholungsbereich deinem gewählten Ziel, nicht dem Glauben, nur ein Bereich funktioniere.',
'sec.strength-power.4.h':'Das geschätzte 1RM ist eine Schätzung',
'sec.strength-power.4.b':'ANCESTOR zeigt ein geschätztes Maximum für eine Wiederholung, abgeleitet aus Lasten und Wiederholungen. Es ist eine Modellierhilfe für Trends, kein getestetes Maximum. Nutze es nicht, um einen Wettkampfversuch zu wählen.',
/* movement-mechanics */
'sec.movement-mechanics.1.h':'Gelenke, Hebel und Hebelarme',
'sec.movement-mechanics.1.b':'Eine Bewegung entsteht dadurch, dass Muskeln über Gelenke an Knochen ziehen. Das Drehmoment hängt von der Last und vom Hebelarm ab, dem senkrechten Abstand zwischen Gelenk und Lastrichtung. Ändere Haltung oder Bewegungsumfang, und du änderst die Anforderung. Deshalb kann sich das gleiche Gewicht in anderer Position anders anfühlen.',
'sec.movement-mechanics.2.h':'Primäre und sekundäre Beteiligung',
'sec.movement-mechanics.2.b':'Die meisten Übungen verteilen Arbeit auf mehrere Muskelgruppen. Der Muskel, der die Hauptarbeit leistet, ist der primäre Beweger; andere assistieren oder stabilisieren. ANCESTOR weist jeder Übung Beitragsgewichte zu, die diese Verteilung abbilden. Diese Gewichte sind eine Vereinfachung für die Volumenbuchhaltung, keine Elektromyographie.',
'sec.movement-mechanics.3.h':'Bewegungsumfang ist eine Trainingsvariable',
'sec.movement-mechanics.3.b':'Mit größerem Umfang zu arbeiten bedeutet oft, bei größeren Muskellängen und in schwächeren Gelenkpositionen Kraft zu erzeugen. Ein reduzierter Umfang erlaubt mehr Last. Keines ist allgemein besser. Die Wahl hängt von Ziel, Gelenk und Person ab.',
'sec.movement-mechanics.4.h':'Technik wird hier nicht geprüft',
'sec.movement-mechanics.4.b':'ANCESTOR sieht dich nicht. Es erfasst, was du gehoben und was du gemeldet hast. Es behauptet nie, deine Technik bewertet zu haben. Die Progressionsregeln behandeln Technikkonsistenz als dein eigenes Urteil, nicht als Messwert.',
/* cardio-health */
'sec.cardio-health.1.h':'Mehr als eine Art von Fitness',
'sec.cardio-health.1.b':'Krafttraining baut Kraft und Muskel auf. Ausdaueraktivität unterstützt Herz-Kreislauf- und Stoffwechselgesundheit. Beweglichkeits- und neuromotorisches Training unterstützt Umfang und Kontrolle. Es sind verschiedene Qualitäten, und sie bestehen nebeneinander. Eine zu verfolgen macht die anderen nicht überflüssig.',
'sec.cardio-health.2.h':'Allgemeine Aktivitätsorientierung',
'sec.cardio-health.2.b':'Große Positionspapiere fassen Wochendosen für Ausdauer und Kraft bei augenscheinlich gesunden Erwachsenen zusammen. Es sind Bevölkerungs-Ausgangspunkte, angepasst an Kapazität und Umstände, keine Verordnungen für eine Person mit Erkrankung.',
'sec.cardio-health.3.h':'Was diese App nicht ist',
'sec.cardio-health.3.b':'ANCESTOR ist kein Medizinprodukt und stellt keine Diagnose. Bei einer Erkrankung, Schwangerschaft oder Symptomen wie Brustschmerz, ungewöhnlicher Atemnot oder Ohnmacht: Hole dir professionellen Rat, bevor du dein Training änderst.',
/* sleep-recovery */
'sec.sleep-recovery.1.h':'Schlaf wird gemeldet, nicht gemessen',
'sec.sleep-recovery.1.b':'Wenn du Schlaf erfasst, nutzt ANCESTOR die Stunden, die du eingibst, und nichts sonst. Keine Wearable-Anbindung, keine physiologische Messung. Alles Folgende erbt diese Grenze.',
'sec.sleep-recovery.2.h':'Warum die App fragt, wann du schläfst',
'sec.sleep-recovery.2.b':'Nachtschichtarbeitende schlafen tagsüber. Eine App, die nächtlichen Schlaf annimmt, würde ihre Ruhe falsch einordnen. ANCESTOR verankert den biologischen Tag an deiner üblichen Aufstehzeit, damit Tagschlaf als normal gilt und nicht als Fehler.',
'sec.sleep-recovery.3.h':'Wie die Schätzung entsteht',
'sec.sleep-recovery.3.b':'Ein Standardwert pro Muskel wird skaliert mit geleisteter Arbeit, Anstrengungsniveau, Trainingsstil, Erfahrung, gemeldetem Schlaf, gemeldetem Muskelkater und Gelenkzustand sowie dem Leistungstrend. Ein begrenzter gelernter Faktor passt sich langsam aus deinen eigenen Ergebnissen an. Das Ergebnis ist eine Schätzung mit sichtbaren Faktoren, überall dort, wo die Zahl erscheint.',
'sec.sleep-recovery.4.h':'Was sie bewusst nicht behauptet',
'sec.sleep-recovery.4.b':'Keine Hormonwerte, keine Diagnose von Übertraining, keine Verletzungserkennung und keine Aussage, ein Muskel sei erholt. Anhaltender Schmerz, Krankheit oder unerklärlicher Leistungsabfall gehören in professionelle Hände, nicht unter weniger Last.',
/* nutrition */
'sec.nutrition.1.h':'Protein, in groben Zügen',
'sec.nutrition.1.b':'Krafttraining erhöht den Proteinbedarf gegenüber Leitlinien für Untrainierte. Metaanalytische Arbeiten legen nahe, dass der Nutzen für die meisten bei Aufnahmen deutlich über der Mindestempfehlung plateauartig abflacht, wobei Alter und Trainingsstand das Bild verschieben. Es sind allgemeine Muster, kein für dich berechnetes Ziel.',
'sec.nutrition.2.h':'Timing ist weniger dramatisch als vermarktet',
'sec.nutrition.2.b':'Das anabole Fenster ist weiter als von der Supplementwerbung behauptet. Für die meisten zählt die tägliche Gesamtaufnahme mehr als eine exakte Minute nach der Einheit.',
'sec.nutrition.3.h':'Diese App berechnet deine Ernährung nicht',
'sec.nutrition.3.b':'ANCESTOR erfasst keine Lebensmittel, schätzt keinen Energieverbrauch, erstellt keine Ernährungsempfehlung. Wenn sie Protein erwähnt, ist das Bildung, kein Rat zu deinem Körper.',
/* aging-mobility */
'sec.aging-mobility.1.h':'Die Kapazität ändert sich, die Trainierbarkeit verschwindet nicht',
'sec.aging-mobility.1.b':'Kraft, Schnellkraft und Gleichgewicht nehmen im Durchschnitt mit dem Alter ab, aber Krafttraining bleibt über die Lebensspanne wirksam. Was sich ändert, sind Dosis, Übungsauswahl und Erholungsspielraum. Nicht, ob Training wirkt.',
'sec.aging-mobility.2.h':'Funktion ist ein legitimes Ziel',
'sec.aging-mobility.2.b':'Aus einem Stuhl aufstehen, Lasten tragen, Treppen steigen und einen Sturz abfangen sind trainierbare Ergebnisse. Genau deshalb unterstützt ANCESTOR funktionelle und Mobilitätsziele neben Hypertrophie.',
'sec.aging-mobility.3.h':'Anpassung ist individuell, nicht diagnostisch',
'sec.aging-mobility.3.b':'Sitz-Optionen, rollstuhlgerechte Optionen, gelenkschonende Auswahl und Mobilitätsarbeit sind Anpassungen, die du wählst. Sie sind keine Aussage über deine Diagnose, und keine Anpassung passt allen mit demselben Etikett. Wo klinisches Urteil zählt, sagt die App das.',
/* training-principles */
'sec.training-principles.1.h':'Progressive Überlastung, definiert',
'sec.training-principles.1.b':'Damit Anpassung weitergeht, muss die Anforderung über die Zeit steigen. Dieser Anstieg kann aus Last, Wiederholungen, Sätzen, Bewegungsumfang, Kontrolle oder kürzeren Pausen kommen. Nicht nur aus mehr Scheiben. Progression wird durch Leistung verdient, nicht durch verstrichene Zeit gewährt.',
'sec.training-principles.2.h':'Warum ANCESTOR nicht nach Kalender aufstockt',
'sec.training-principles.2.b':'Eine Regel "zwei Wochen sind vorbei, addiere 2,5 kg" ignoriert, ob du das Ziel erreicht hast. ANCESTOR erhöht die Last nur, wenn jeder vorgeschriebene Satz die obere Grenze des Wiederholungsbereichs mit der vorgesehenen Anstrengung erreicht. Fehlt die Evidenz, bleibt die Last. Sinkt die Leistung zweimal hintereinander, geht sie zurück.',
'sec.training-principles.3.h':'Volumen ist eine Variable mit Abwägungen',
'sec.training-principles.3.b':'Höheres Wochenvolumen geht mit größerer durchschnittlicher Hypertrophie einher, mit abnehmendem Ertrag und steigenden Erholungskosten. ANCESTOR erfasst Wochensätze pro Muskelgruppe, damit Veränderungen sichtbar und prüfbar sind. Es erklärt kein Optimum für dich.',
'sec.training-principles.4.h':'Adhärenz dominiert',
'sec.training-principles.4.b':'Das beste Programm ist das, das lange genug durchgehalten wird, um zu wirken. Deshalb behandelt ANCESTOR verpasste Einheiten als Information statt als Scheitern. Und deshalb ist Beständigkeit ein wählbares Ziel.',
/* scientific-literacy */
'sec.scientific-literacy.1.h':'Nicht alle Evidenz ist gleich',
'sec.scientific-literacy.1.b':'Systematische Übersichten und Metaanalysen stehen über Einzelstudien für die meisten praktischen Fragen. Gut geplante Studien über Beobachtungsarbeit. Mechanistische Begründung und Expertenmeinung darunter. Aktualität ist keine Qualität. Eine neue Studie übertrifft kein gut gestütztes Gesamtwerk.',
'sec.scientific-literacy.2.h':'Warum eine Einzelstudie eine Empfehlung selten ändert',
'sec.scientific-literacy.2.b':'Mit flexiblen Analysen, kleinen Stichproben und Publikationsdruck kann jedes einzelne Ergebnis brüchig sein. ANCESTOR verlangt daher, dass eine Quelle geprüft und von nutzbarer Qualität ist, bevor sie eine nutzerwirksame Regel beeinflussen darf. Nichts geht direkt aus der Literatur in den Betrieb.',
'sec.scientific-literacy.3.h':'KI ist keine Quelle',
'sec.scientific-literacy.3.b':'Erklärungen in dieser App sind nachvollziehbar geschrieben. Jede Forschungsaussage verweist auf einen Evidenzdatensatz mit Titel, Autoren, Jahr und Identifikator, wo vorhanden. Ein KI-Satz gilt niemals als Zitat.',
'sec.scientific-literacy.4.h':'Korrelation, Kausalität und du',
'sec.scientific-literacy.4.b':'Die Erholungsschätzungen von ANCESTOR sind mit deiner erfassten Historie verknüpft. Sie sind keine bewiesenen Ursachen deiner nächsten Leistung. Die App trennt Beobachtungen von Deutungen und sagt, was was ist.',
/* misconceptions */
'sec.misconceptions.1.h':'Ein kurzer Rundgang durch zuversichtliches Irren',
'sec.misconceptions.1.b':'Die Fitnesskultur ist voll von Behauptungen mit totaler Gewissheit und dünner Basis: Der Pump verursache Wachstum. Muskelkater beweise Wirksamkeit. Ein enges Fenster nach dem Training entscheide über Ergebnisse. Das Trainieren eines Muskels verbrenne das Fett darüber. Eine neue Studie kippe Jahrzehnte Arbeit. Jede hat ein klares Urteil in der Evidenz.',
'sec.misconceptions.2.h':'Warum Mythen bleiben',
'sec.misconceptions.2.b':'Sie sind einfach, umsetzbar und werden von Menschen mit kommerziellen Anreizen wiederholt. Dass eine Behauptung populär ist, ist kein Beweis, dass sie wahr ist. Und dass ein Supplement legal ist, kein Beweis, dass es wirkt.',
'sec.misconceptions.3.h':'Die Gewohnheit, die sich lohnt',
'sec.misconceptions.3.b':'Frage, was dich umstimmen würde. Wenn eine Behauptung keine Messung, keine Vergleichsgruppe und keinen Mechanismus hat, ist sie kein Befund. Sondern eine Geschichte.',
};

Object.keys(TLES).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TLES[l]); });
Object.keys(TLDE).forEach(l => { if (!T[l]) T[l] = {}; Object.assign(T[l], TLDE[l]); });
