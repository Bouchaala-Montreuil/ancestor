/* ============================================================================
   ANCESTOR — Arabic (العربية)

   SCOPE: this translation covers the core interface flows — navigation, the
   training decision, anatomy, session logging, progress and profile.

   It is deliberately NOT described as complete. `locale.js` measures real
   coverage per language and the UI states it, rather than silently falling
   back to English with no warning.
   ========================================================================== */

const TAR = {
'state.stop':'لا تتدرّب اليوم',
'app.bootNote':'سجلّك لا يغادر هذا الجهاز أبدًا','app.name':'ANCESTOR','app.tag':'محرّك التعافي',

'nav.home':'الرئيسية','nav.today':'اليوم','nav.session':'الحصة','nav.body':'الجسم','nav.progress':'التقدّم','nav.profile':'الملف',

'btn.next':'متابعة','btn.back':'رجوع','btn.save':'حفظ','btn.cancel':'إلغاء','btn.close':'إغلاق',
'btn.done':'تم','btn.start':'بدء الحصة','btn.confirm':'تأكيد','btn.delete':'حذف','btn.edit':'تعديل',
'btn.skip':'تخطّي','btn.finish':'إنهاء الحصة','btn.add':'إضافة','btn.log':'تسجيل',
'btn.export':'تصدير البيانات','btn.yes':'نعم','btn.no':'لا','btn.print':'طباعة','btn.retry':'إعادة المحاولة',

'c.kg':'كجم','c.lb':'رطل','c.sets':'مجموعات','c.reps':'تكرارات','c.rir':'RIR','c.rest':'راحة',
'c.min':'دقيقة','c.sec':'ث','c.never':'أبداً','c.none':'لا شيء','c.optional':'اختياري',
'c.est':'تقدير','c.measured':'مقاس','c.today':'اليوم','c.and':'و','c.weight':'الحمل','c.load':'الحمل',
'c.target':'الهدف','c.previous':'السابق','c.reason':'السبب','c.evidence':'البيانات','c.uncertain':'عدم اليقين','c.why':'لماذا',

'home.title':'اليوم','home.hello':'مرحباً','home.sub':'القرار، والتشريح، والأداء الحالي',
'home.decision':'قرار التدريب','home.analysis':'تحليل مفصّل','home.performance':'الأداء',
'home.lastSession':'آخر حصة','home.nextSession':'الحصة القادمة','home.insufficient':'بيانات غير كافية',
'home.map':'خريطة العضلات','home.timeline':'الأيام السبعة القادمة','home.quick':'إدخال سريع',
'home.correct':'تصحيح بيانات','home.logsleep':'تسجيل النوم','home.logshift':'تسجيل وردية عمل',
'home.logfeel':'تسجيل الحالة','home.noplan':'لا توجد حصة مقررة',

'decision.label':'التوصية','decision.train':'تدرّب','decision.modify':'عدّل','decision.rest':'راحة',
'decision.confidence':'الثقة','decision.limits':'حدود هذه التوصية',
'decision.trainWhy':'نفّذ الحصة المقررة.','decision.modifyWhy':'عدّل الحصة: قلّل الحجم أو الحمل.',
'decision.restWhy':'أعطِ الأولوية للتعافي اليوم.',

'readiness.title':'الجاهزية المقدّرة','readiness.label':'جاهزية',
'readiness.definition':'الوقت المنقضي مقارنةً بنافذة التعافي المقدّرة. تقدير، وليس قياساً.',
'readiness.noscore':'لا توجد بيانات كافية للتقدير','readiness.definitionShort':'اتجاه 21 يوماً',

'state.ok':'ملائم','state.warn':'احتياط','state.alert':'تقييدي','state.none':'لا بيانات',
'state.loading':'جارٍ التحميل','state.error':'خطأ','state.saved':'تم الحفظ','state.offline':'غير متصل',
'state.nodata':'لا بيانات','state.noresult':'لا نتائج لهذه المرشّحات','state.needSetup':'غير مضبوط',

'body.title':'التشريح','body.side':'العرض','body.front':'أمامي','body.back':'خلفي',
'body.rotate':'تدوير','body.zoom':'تكبير على المحدد','body.reset':'إعادة العرض','body.select':'اختر مجموعة عضلية','body.selectBody':'اضغط على عضلة في الشكل، أو اخترها من القائمة. الشكل والقائمة هما المجموعات الاثنتا عشرة نفسها.',
'body.note2d':'تشريح تفاعلي ثنائي الأبعاد — أمامي/خلفي، تدوير، تحديد، تكبير. ليس نموذجاً ثلاثي الأبعاد.',
'body.detail':'سجل العضلة','body.last':'آخر عمل مسجّل','body.never':'لم يُسجّل قط',
'body.exercises':'التمارين المرتبطة','body.sets':'المجموعات الأخيرة','body.trend':'الاتجاه',
'body.recovery':'التعافي المقدّر','body.factors':'العوامل','body.missing':'بيانات ناقصة','body.reco':'ملاحظة',
'body.estimateNote':'مقدَّر من سجلّك. ليس قياساً للنسيج العضلي.',
'body.tracked':'مجموعات متتبَّعة','body.left':'متبقٍّ','body.contribution':'المساهمة',
'body.observations':'ملاحظات','body.close':'إغلاق','body.train':'تسجيل حصة',
'body.zoomTo':'تكبير على هذه العضلة','body.fullView':'عرض الجسم كاملاً',
'body.tapHint':'انقر على مجموعة عضلية لفتح سجلّها',
'body.contributionNote':'نصيب عمل هذا التمرين الذي يقع على هذه المجموعة العضلية.',
'body.nodataNote':'لا توجد مجموعة مسجّلة بعد. سجّل حصة تستهدف هذه العضلة لملء السجل.',
'body.neverBody':'لا توجد مجموعة مسجّلة','body.neverHint':'ستظهر هذه المجموعة بعد تسجيل تمرين يستهدفها.',

'progress.title':'التقدّم','progress.overview':'ملخّص','progress.detail':'تحليل','progress.unknownEx':'بعض السجلات تشير إلى تمارين غير موجودة في هذا الإصدار. تبقى محفوظة وتُصدَّر كما هي.',
'progress.exercise':'التمرين','progress.period':'الفترة','progress.p30':'30 يوماً','progress.p90':'90 يوماً','progress.pall':'كل الفترة',
'progress.volume':'الحجم لكل مجموعة عضلية','progress.volumeDef':'الحمل × التكرارات × مساهمة كل تمرين',
'progress.sessions':'الحصص','progress.pr':'الأرقام الشخصية','progress.sets':'مجموعات','progress.reps':'تكرارات',
'progress.load':'الحمل','progress.date':'التاريخ','progress.table':'سجل الحصص','progress.compare':'مقارنة',
'progress.sample':'مثال توضيحي','progress.sampleNote':'بيانات خيالية للشرح فقط. ليست بياناتك.',
'progress.start':'سجّل أول حصة','progress.best':'الأفضل','progress.prDef':'محققة في هذه الفترة',
'progress.nodata':'لا توجد حصة مسجّلة','progress.nodataBody':'ستظهر اتجاهاتك وأحجامك وأرقامك هنا بعد تسجيل أول حصة.',

'chart.unit':'الوحدة','chart.pr':'رقم شخصي','chart.load':'الحمل','chart.e1rm':'تقدير 1RM',
'chart.nodata':'لا توجد بيانات للعرض','chart.nodata.body':'سجّل بضع حصص وسيظهر الاتجاه هنا.',
'chart.onepoint.title':'حصة واحدة مسجّلة','chart.onepoint.body':'نقطة واحدة لا تُظهر اتجاهًا. يلزم حصّتان أو أكثر قبل رسم تقدّم.',

'tl.sleep':'نوم','tl.shift':'عمل','tl.now':'الآن',

'session.title':'الحصة','session.exercise':'التمرين','session.setOf':'مجموعة',
'session.load':'الحمل','session.reps':'تكرارات','session.rir':'RIR','session.target':'الهدف',
'session.last':'المرة السابقة','session.validate':'تأكيد المجموعة','session.rest':'راحة','session.skipset':'تخطّي المجموعة',
'session.finish':'إنهاء الحصة','session.discard':'إلغاء','session.summary':'ملخّص الحصة',
'session.compare':'مقارنةً بآخر حصة','session.saved':'تم حفظ الحصة','session.prs':'أرقام جديدة',
'session.empty':'أدخل حملاً وعدد تكرارات لمجموعة واحدة على الأقل.','session.sub':'استبدال',
'session.keep':'يحافظ على نمط الحركة والعضلات المستهدفة.','session.nosub':'لا يوجد بديل متاح مع معداتك.',
'session.draftRestored':'تم استرجاع الحصة الجارية','session.warmup':'مجموعات الإحماء لا تُحتسب. قم بها مع ذلك.',
'session.cue':'التقنية','session.planned':'مقرّرة','session.noplan':'لا توجد حصة مقررة اليوم',
'session.targetHit':'تم بلوغ الهدف','session.skipped':'متخطّاة','session.restDone':'انتهت الراحة', 'rest.notifyT':'تنبيه الراحة','rest.notifyLbl':'أخبرني عند انتهاء الراحة','rest.notifyHint':'إشعار من النظام عندما يصل العدّ التنازلي إلى الصفر ويكون هذا التبويب في الخلفية. العدّ التنازلي يبقى مؤقتاً داخل الصفحة: إذا أوقف المتصفح التبويب أو أغلقته، لا يعمل شيء ولن يصل أي تنبيه.','rest.notifyStateOn':'مفعّل','rest.notifyStateOff':'متوقف','rest.notifyOn':'تنبيهات الراحة مفعّلة. تصل ما دام هذا التبويب في الخلفية.','rest.notifyOff':'تنبيهات الراحة متوقفة.','rest.notifyBlocked':'متصفحك يحجب الإشعارات لهذا الموقع، لذلك لن يصل شيء. اسمح بها في إعدادات الموقع أولاً.','rest.notifyUnsupported':'هذا المتصفح لا يستطيع إرسال إشعارات من صفحة كهذه، لذلك يبقى العدّ التنازلي على الشاشة فقط.','rest.notifyTitle':'انتهت الراحة','rest.notifyBody':'حان وقت المجموعة التالية.',
'session.nosubBody':'لا يوجد تمرين آخر في إعدادك يستهدف هذه العضلات بالطريقة نفسها.',
'session.noplanBody':'أكمل الإعداد أو أعد بناء البرنامج للحصول على حصة مقرّرة.',

'profile.title':'الملف','profile.planning':'الجدول','profile.workshifts':'ساعات العمل',
'profile.gProgramme':'البرنامج','profile.gBody':'الجسم والتعافي',
'profile.gAccess':'إمكانية الوصول والعرض','profile.gData':'البيانات وحول',
'profile.sleepLog':'النوم المُعلَن','profile.data':'بياناتك','profile.about':'حول','profile.rebuild':'إعادة بناء البرنامج',
'profile.exercises':'التمارين','profile.limits':'القيود','profile.language':'اللغة',

'you.data':'بياناتك','you.about':'حول','you.export':'تصدير كل البيانات','you.import':'استيراد',
'you.erase':'حذف كل شيء','you.erase.warn':'سيؤدي هذا إلى حذف ملفك وحصصك ونومك وسجل وردياتك نهائياً من هذا الجهاز. لا يمكن التراجع.',
'you.saved':'تم الحفظ','you.offline':'يعمل دون اتصال','you.version':'الإصدار',

'mg.chest':'الصدر','mg.back':'الظهر','mg.shoulders':'الكتفان','mg.biceps':'الباي','mg.triceps':'التراي',
'mg.forearms':'الساعدان','mg.quads':'الفخذ الأمامي','mg.hamstrings':'الفخذ الخلفي','mg.glutes':'الأرداف',
'mg.calves':'السمانة','mg.abs':'البطن','mg.lowerback':'أسفل الظهر',
'mst.ready':'جاهز','mst.caution':'احتياط','mst.rest':'راحة','mst.fresh':'لا بيانات',

'trend.up':'مرتفع','trend.down':'منخفض','trend.flat':'مستقر','trend.unknown':'بيانات غير كافية',

'onb.step':'خطوة','onb.of':'من','onb.name':'الاسم','onb.redo':'إعادة الإعداد',
'onb.welcome.t':'تدرّب عندما تكون جاهزاً.\nتقدّم عندما تستحق ذلك.',
'onb.welcome.d':'نظام تدريب صُمّم للمتمرنين الطبيعيين، والعاملين بنظام الورديات، وكل من لا تسير حياته من الاثنين إلى الجمعة.',
'onb.welcome.cta':'ابدأ',
'onb.privacy.t':'تبقى بياناتك على جهازك','onb.privacy.agree':'فهمت',
'onb.privacy.l1':'يتم تخزين كل شيء محلياً في متصفحك. لا يُرفع شيء.',
'onb.privacy.l2':'لا حساب، ولا بريد، ولا تحليلات، ولا إعلانات.',
'onb.privacy.l3':'يمكنك التصدير أو الحذف في أي وقت من الإعدادات.',
'onb.privacy.l4':'هذه أداة تدريب. ليست جهازاً طبياً ولا تُشخّص شيئاً.',
'onb.exp.t':'منذ متى تتدرّب بانتظام؟',
'onb.exp.b':'أقل من 6 أشهر','onb.exp.b.d':'جديد في التدريب المنظّم',
'onb.exp.i':'من 6 أشهر إلى سنتين','onb.exp.i.d':'يعرف الحركات الأساسية',
'onb.exp.a':'أكثر من سنتين','onb.exp.a.d':'مرتاح للتدريب القاسي',
'onb.goal.t':'ما هدفك الرئيسي؟','onb.goal.h':'تضخيم','onb.goal.h.d':'بناء العضلات','onb.goal.s':'قوة','onb.goal.s.d':'رفع أوزان أثقل',
'onb.goal.r':'إعادة تشكيل','onb.goal.r.d':'خسارة الدهون مع الحفاظ على العضلات','onb.goal.g':'لياقة عامة','onb.goal.g.d':'صحة وقدرة',
'onb.equip.t':'ما المعدات المتوفرة لديك؟','onb.equip.gym':'صالة كاملة','onb.equip.gym.d':'أثقال وآلات وكابلات',
'onb.equip.home':'صالة منزلية','onb.equip.home.d':'دمبلز ومقعد','onb.equip.min':'وزن الجسم فقط','onb.equip.min.d':'بدون معدات',
'onb.limits.t':'قيود تؤثر على اختيار التمارين؟','onb.limits.h':'لا شيء على علمي','onb.limits.note':'هذا يستبعد التمارين التي تُهيّج المنطقة عادةً. ليس نصيحة طبية.',
'onb.limits.shoulder':'الكتف','onb.limits.knee':'الركبة','onb.limits.lowback':'أسفل الظهر','onb.limits.wrist':'المعصم','onb.limits.elbow':'المرفق',
'onb.avail.t':'كم يوماً أسبوعياً يمكنك التدريب واقعياً؟','onb.avail.len':'ما مدة الحصة الواحدة؟',
'onb.avail.len.20':'20 دقيقة','onb.avail.len.35':'35 دقيقة','onb.avail.len.50':'50 دقيقة','onb.avail.len.70':'70 دقيقة أو أكثر',
'onb.shift.t':'هل تعمل بنظام الورديات؟','onb.shift.no':'جدول نهاري عادي','onb.shift.night':'ورديات ليلية','onb.shift.rot':'ورديات متناوبة',
'onb.shift.times':'أوقات الوردية المعتادة','onb.shift.note':'تُعالَج الورديات التي تعبر منتصف الليل بشكل صحيح.','onb.shift.add':'إضافة وردية',
'onb.sleep.t':'كم ساعة تنام عادةً؟','onb.sleep.h':'ساعة في الليلة','onb.sleep.var':'كم يتباين ذلك؟',
'onb.sleep.var.1':'منتظم جداً','onb.sleep.var.2':'بعض التباين','onb.sleep.var.3':'غير منتظم جداً','onb.sleep.wake':'وقت الاستيقاظ المعتاد',
'onb.style.t':'أي أسلوب تدريب تريد البدء به؟',
'onb.style.hit':'حجم منخفض، شدة عالية','onb.style.hit.d':'مجموعات أقل حتى قرب الفشل، وتعافٍ أطول. مناسب لضيق الوقت.',
'onb.style.std':'حجم قياسي','onb.style.std.d':'النهج الأكثر دعماً بالأدلة. نحو ثلاث مجموعات قاسية لكل تمرين.',
'onb.style.min':'الحد الأدنى الفعّال','onb.style.min.d':'أقصر الحصص التي تُنتج تقدّماً.',
'onb.style.freq':'تكرار أعلى','onb.style.freq.d':'حصص أكثر، عمل أقل في كل حصة.',
'onb.style.note':'لا يوجد أسلوب مثالي للجميع. يمكنك تغييره في أي وقت، وسيخبرك التطبيق إن كانت نتائجك تشير إلى غير ذلك.',
'onb.units.t':'الوحدات؟','onb.units.kg':'كيلوغرام','onb.units.lb':'رطل',
'onb.ex.t':'أيٌّ من هذه يمكنك أداؤه براحة؟','onb.ex.d':'تُستبعد التمارين غير المحددة. يمكنك مراجعتها لاحقاً.',
'onb.ex.hint':'كل ما تسمح به أدواتك مضمّن. افتح مجموعة فقط لإزالة ما لا تستطيع أداءه.',
'onb.ready.t':'بناء برنامجك','onb.ready.d':'تبدأ نوافذ التعافي بتقديرات متحفّظة، ثم تتكيّف مع أدائك الفعلي المسجّل.',
'onb.ready.cta':'فتح ANCESTOR','onb.why':'لماذا نسأل','onb.whyBody':'هذا يضبط برنامجك ونوافذ التعافي المقدّرة وجدولك. يمكنك تغييره من الملف في أي وقت.',

'goal.h':'تضخيم عضلي','goal.h.d':'بناء العضلات','goal.s':'قوة','goal.s.d':'رفع أوزان أثقل',
'goal.r':'إعادة تشكيل','goal.r.d':'خسارة الدهون مع الحفاظ على العضلات','goal.g':'لياقة عامة','goal.g.d':'صحة وقدرة',
'goal.e':'تحمّل عضلي','goal.e.d':'أداء المزيد من التكرارات','goal.m':'الحركة والمرونة','goal.m.d':'نطاق حركة أفضل',
'goal.b':'التوازن','goal.b.d':'ثبات وتناسق','goal.f':'قوة وظيفية','goal.f.d':'مهام الحياة اليومية','goal.c':'الانتظام','goal.c.d':'الاستمرارية قبل كل شيء',

'env.gym':'صالة رياضية','env.gym.d':'معدات كاملة','env.home':'المنزل','env.home.d':'معدات محدودة','env.outdoor':'الخارج','env.outdoor.d':'بدون معدات ثابتة','env.limited':'معدات محدودة','env.limited.d':'أشرطة مطاطية ووزن الجسم',

'need.seatedOnly':'تمارين الجلوس فقط','need.seatedOnly.d':'عرض التمارين التي تؤدّى جالساً فقط',
'need.wheelchair':'متوافق مع الكرسي المتحرك','need.wheelchair.d':'عرض الخيارات المناسبة للكرسي المتحرك',
'need.lowImpact':'حركة منخفضة التأثير','need.lowImpact.d':'تجنّب القفز والاصطدامات العالية',
'need.noStanding':'لا أستطيع الوقوف','need.noStanding.d':'استبعاد التمارين التي تتطلب الوقوف',
'need.noKneeling':'لا أستطيع الركوع','need.noKneeling.d':'استبعاد أوضاع الركوع',
'need.noFloor':'لا أستطيع الجلوس أو الاستلقاء على الأرض','need.noFloor.d':'استبعاد أوضاع الأرضية',
'need.noGrip':'قبضة محدودة','need.noGrip.d':'تجنّب التمارين التي تتطلب إمساكاً قوياً',
'need.noOverhead':'حركة محدودة فوق الرأس','need.noOverhead.d':'تجنّب الوصول فوق الرأس',
'need.noBalance':'توازن محدود','need.noBalance.d':'تجنّب التمارين التي تتطلب توازناً كبيراً',

'a11y.title':'إمكانية الوصول','a11y.textSize':'حجم النص','a11y.textSizeHint':'يُطبَّق على الواجهة بالكامل',
'a11y.contrast':'تباين عالٍ','a11y.contrastHint':'حدود وخطوط أقوى لقراءة أسهل',
'a11y.motion':'تقليل الحركة','a11y.motionHint':'يُوقف الانتقالات غير الضرورية',
'a11y.simple':'واجهة مبسّطة','a11y.simpleHint':'عناوين أقصر وإخفاء التفاصيل الثانوية',
'a11y.needs':'احتياجات التمرين','a11y.needsTitle':'ما التمارين المناسبة لك؟',
'a11y.needsHint':'اختياري. لا يتطلب أي تشخيص، ويمكنك تغييره في أي وقت.',
'a11y.disclaimer':'هذه الخيارات تُكيّف البرنامج، ولا تعني أن تمريناً ما آمن لكل شخص. الملاءمة تعتمد على حالتك. راجع مختصاً عند الشك.',
'a11y.needSeated':'يتطلب وضعية جلوس','a11y.needWheelchair':'غير متوافق مع الكرسي المتحرك',
'a11y.needLowImpact':'غير منخفض التأثير','a11y.needGrip':'يتطلب إمساكاً قوياً','a11y.needKneel':'يتطلب الركوع',
'a11y.needFloor':'يتطلب الجلوس أو الاستلقاء على الأرض','a11y.needOverhead':'يتطلب الوصول فوق الرأس',
'a11y.needStand':'يتطلب الوقوف','a11y.needBalance':'يتطلب توازناً كبيراً',
'a11y.skip':'تخطَّ إلى المحتوى الرئيسي','a11y.figureAlt':'رسم تشريحي تفاعلي. استخدم القائمة أدناه لتحديد مجموعة عضلية.',

'sleep.title':'تسجيل النوم','sleep.start':'وقت النوم','sleep.end':'وقت الاستيقاظ','sleep.quality':'الجودة',
'sleep.q1':'ضعيف','sleep.q2':'مقبول','sleep.q3':'جيد','sleep.q4':'جيد جداً','sleep.q5':'ممتاز',
'sleep.note':'يُستخدم لتقدير سعة التعافي. لا يقيس شيئاً فسيولوجياً.','sleep.saved':'تم تسجيل النوم',
'sleep.avg':'في المتوسط','sleep.entries':'إدخالات',

'shift.title':'تسجيل وردية','shift.start':'البداية','shift.end':'النهاية','shift.night':'وردية ليلية',
'shift.saved':'تم تسجيل الوردية','shift.crosses':'تعبر منتصف الليل — تم التعامل معها بشكل صحيح.',
'shift.last7':'في آخر 7 أيام','shift.nights':'ليالٍ',

'feel.title':'كيف تشعر؟','feel.soreness':'ألم عضلي','feel.joint':'إزعاج في المفاصل','feel.fatigue':'إرهاق عام','feel.illness':'ألم أو مرض',
'feel.none':'لا شيء','feel.mild':'خفيف','feel.moderate':'متوسط','feel.high':'شديد','feel.severe':'حاد','feel.where':'أين؟',
'feel.saved':'تم التسجيل','feel.stop':'أبلغت عن ألم أو مرض. فكّر في التوقف واستشارة مختص إذا استمرت الأعراض أو ساءت.',

'unc.fewSessions':'عدد الحصص المسجّلة قليل، لذا تستند نوافذ التعافي إلى قيم متحفّظة بدلاً من بياناتك.',
'unc.noSleep':'لم يُسجَّل نوم مؤخراً، لذلك لم يُؤخذ النوم في الاعتبار.',
'unc.noShift':'لا توجد بيانات ورديات، لذلك لم يُؤخذ الجدول في الاعتبار.',
'unc.estimate':'التعافي مُقدَّر من سجلّك. ليس قياساً للنسيج العضلي.',

'about.p1':'ANCESTOR أداة تدريب ونمط حياة. ليست جهازاً طبياً، ولا تُشخّص أو تعالج أو تقي أي حالة.',
'about.p2':'لا يمكنها قياس تعافي العضلات أو مستويات الهرمونات أو الجاهزية. نوافذ التعافي تقديرات مشتقة من سجلّك.',
'about.p3':'تستند النصائح إلى مبادئ مدعومة بالأدلة وهي متحفّظة عمداً. لا تُغني عن المشورة المهنية.',
'about.p4':'لا توجد طريقة، بما فيها أسلوب الحجم المنخفض والشدة العالية، مثالية للجميع. سيخبرك التطبيق عندما تشير نتائجك إلى تغيير.',
'about.p5':'لا تتدرّب مع ألم كبير. استشر مختصاً مؤهلاً قبل التدريب إن كانت لديك حالة صحية أو إصابة أو شك.',

'dlg.confirm':'هل أنت متأكد؟','err.generic':'حدث خطأ ما. بياناتك محفوظة.',
'hist.pr.none':'لا أرقام بعد','hist.note':'القيم المقدَّرة محسوبة من مجموعاتك المسجّلة. ليست حدوداً قصوى مقاسة.',
'prog.title':'البرنامج','prog.change':'تغيير البرنامج','prog.plannedShort':'مقرّرة',
'train.firsttime':'أول مرة — أنشئ خط أساس','train.session':'الحصة',
'keyboard.hint':'يمكن التنقل بالكامل من لوحة المفاتيح: Tab للتنقل، Enter أو المسافة للتحديد.'
};

if (!T.ar) T.ar = {};
Object.assign(T.ar, TAR);
