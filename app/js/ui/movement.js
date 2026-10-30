/* Exercise-specific movement illustrations and guidance. The faceless figures
   are original, schematic teaching aids, not recordings or medical advice.
   Each library entry explicitly chooses its position, apparatus and copy; an
   unknown exercise never falls back to an unrelated diagram. */
const MOVEMENT_GUIDES = {
  'bb-bench':['bench','bar','bench'], 'db-bench':['bench','dumbbell','bench'],
  'machine-press':['chestMachine','machine','chestMachine'], 'incline-db':['incline','dumbbell','incline'],
  'db-fly':['benchFly','dumbbell','fly'], 'cable-fly':['cableFly','cable','cableFly'],
  'pushup':['pushup','','pushup'], 'dip':['dip','','dip'],
  'ohp':['overhead','bar','overhead'], 'db-ohp':['overhead','dumbbell','overhead'],
  'lateral-raise':['lateral','dumbbell','lateral'], 'cable-lateral':['lateral','cable','lateral'],
  'rear-delt-fly':['rearFly','dumbbell','rearFly'],
  'pullup':['pullup','','pullup'], 'lat-pulldown':['pulldown','cable','pulldown'],
  'cg-pulldown':['pulldown','cable','pulldown'],
  'bb-row':['hingeRow','bar','hingeRow'], 'db-row':['supportedRow','dumbbell','supportedRow'],
  'cable-row':['seatedRow','cable','seatedRow'], 'chest-supported-row':['supportedMachine','machine','supportedMachine'],
  'face-pull':['facePull','cable','facePull'],
  'bb-squat':['squat','shoulderBar','squat'], 'leg-press':['legPress','machine','legPress'],
  'goblet-squat':['squat','goblet','squat'], 'bulgarian-split':['split','dumbbell','split'],
  'lunge':['lunge','dumbbell','lunge','stride'], 'step-up':['stepUp','dumbbell','stepUp'],
  'leg-ext':['legExt','machine','legExt'],
  'deadlift':['deadlift','bar','deadlift'], 'rdl':['rdl','bar','rdl'],
  'hip-thrust':['hipThrust','hipBar','hipThrust'], 'leg-curl':['legCurl','machine','legCurl'],
  'back-ext':['backExt','','backExt'], 'standing-calf':['calf','machine','calf'],
  'seated-calf':['seatedCalf','machine','seatedCalf'],
  'bb-curl':['curl','bar','curl'], 'db-curl':['curl','dumbbell','curl'],
  'cable-curl':['curl','cableLow','curl'], 'hammer-curl':['curl','dumbbell','curl'],
  'tri-pushdown':['pushdown','cableHigh','pushdown'], 'oh-tri-ext':['overheadExt','dumbbell','overheadExt'],
  'skull-crusher':['skull','bar','skull'], 'closegrip-bench':['bench','bar','bench'],
  'wrist-curl':['wristCurl','dumbbell','wristCurl'], 'reverse-curl':['curl','dumbbell','curl'],
  'cable-crunch':['cableCrunch','cableHigh','cableCrunch'], 'hanging-raise':['hangingRaise','','hangingRaise'],
  'ab-wheel':['abWheel','wheel','abWheel'], 'db-rdl':['rdl','dumbbell','rdl'],
  'db-calf':['calf','dumbbell','calf'], 'db-crunch':['crunch','chestWeight','crunch'],
  'pike-pushup':['pike','','pike'], 'chinup':['pullup','','pullup'],
  'bench-dip':['benchDip','','benchDip'], 'dead-hang':['hang','','hang','hold'],
  'bw-squat':['squat','','squat'], 'nordic-curl':['nordic','','nordic'],
  'glute-bridge':['bridge','','bridge'], 'bw-calf':['calf','single','calf'],
  'plank':['plank','','plank','hold'], 'side-plank':['sidePlank','','sidePlank','hold'],
  'hollow-hold':['hollow','','hollow','hold'], 'wall-sit':['wallSit','','wallSit','hold'],
  'assisted-pullup':['pullup','assisted','pullup'], 'assisted-dip':['dip','assisted','dip'],
  'weighted-pullup':['pullup','added','pullup'], 'weighted-dip':['dip','added','dip'],
  'farmer-carry':['carry','dumbbell','carry','stride'],
  'band-row-seated':['chairRow','band','seatedRow'], 'band-press-seated':['chairPress','band','chairPress'],
  'wall-pushup':['wallPush','','wallPush'], 'chair-stand':['chairStand','','chairStand'],
  'seated-leg-ext':['legExt','','legExt'], 'seated-march':['seatedMarch','','seatedMarch'],
  'band-pull-apart':['pullApart','band','pullApart'], 'band-curl':['curl','bandLow','curl'],
  'band-pressdown':['pushdown','bandHigh','pushdown'],
  'dead-bug':['deadBug','','deadBug'], 'bird-dog':['birdDog','','birdDog'],
  'cat-cow':['catCow','','catCow'], 'heel-slide':['heelSlide','','heelSlide'],
  'overhead-reach':['reach','','reach'], 'balance-stand':['balance','','balance','hold'],
  'seated-twist':['twist','','twist'], 'sled-push':['sled','','sled','stride'],
  'row-erg':['rower','','rower'], 'bike-erg':['bike','','bike','stride'],
  'run-interval':['run','','run','stride']
};
/* A pose lists head, shoulder, hip, elbow, hand, knee and ankle. Optional
   points 8–11 describe the far arm and leg for front or asymmetric views. */
const MOVEMENT_POSES = {
  benchTop:[[29,65],[43,72],[80,73],[52,49],[53,28],[98,103],[102,138]],
  benchLow:[[29,65],[43,72],[80,73],[56,76],[53,59],[98,103],[102,138]],
  inclineTop:[[40,37],[49,50],[78,80],[58,32],[59,14],[97,108],[100,138]],
  inclineLow:[[40,37],[49,50],[78,80],[64,58],[59,43],[97,108],[100,138]],
  stand:[[70,19],[70,34],[70,76],[75,57],[74,81],[71,108],[72,139]],
  squatTop:[[70,19],[70,34],[70,76],[85,49],[98,52],[71,108],[72,139]],
  squatLow:[[76,43],[70,56],[62,91],[88,64],[102,65],[95,103],[81,139]],
  pushHigh:[[29,66],[44,76],[84,99],[45,105],[45,136],[109,113],[135,131]],
  pushLow:[[28,99],[42,109],[83,119],[32,125],[45,136],[109,127],[135,133]],
  dipTop:[[70,19],[70,34],[70,76],[49,53],[49,76],[75,106],[76,136]],
  dipLow:[[70,48],[70,62],[70,100],[47,94],[49,76],[76,121],[77,137]],
  pressLow:[[70,20],[70,35],[70,76],[51,48],[54,34],[70,108],[71,139],[89,48],[86,34],[62,108],[61,139]],
  pressHigh:[[70,20],[70,35],[70,76],[54,17],[55,2],[70,108],[71,139],[86,17],[85,2],[62,108],[61,139]],
  lateralLow:[[70,19],[70,34],[70,76],[55,58],[52,81],[79,108],[81,139],[85,58],[88,81],[61,108],[59,139]],
  lateralHigh:[[70,19],[70,34],[70,76],[48,40],[28,40],[79,108],[81,139],[92,40],[112,40],[61,108],[59,139]],
  hingeHang:[[104,47],[94,58],[62,78],[95,79],[96,102],[71,108],[72,139]],
  hingePull:[[104,47],[94,58],[62,78],[82,62],[78,70],[71,108],[72,139]],
  rearFlyHigh:[[104,47],[94,58],[62,78],[78,46],[62,38],[71,108],[72,139]],
  pullHang:[[70,58],[70,72],[70,102],[50,48],[52,28],[75,120],[76,132],[90,48],[88,28],[65,120],[64,132]],
  pullTop:[[70,17],[70,31],[70,71],[50,50],[52,28],[75,96],[76,121],[90,50],[88,28],[65,96],[64,121]],
  pulldownTop:[[65,56],[65,70],[65,104],[48,45],[50,24],[94,109],[96,138],[82,45],[80,24],[89,109],[91,138]],
  pulldownLow:[[65,56],[65,70],[65,104],[49,77],[53,68],[94,109],[96,138],[81,77],[77,68],[89,109],[91,138]],
  chairPressIn:[[56,55],[56,70],[56,103],[68,83],[78,75],[91,109],[93,139]],
  chairPressOut:[[56,55],[56,70],[56,103],[80,74],[105,74],[91,109],[93,139]],
  flyOpen:[[70,22],[70,38],[70,78],[48,50],[29,62],[80,108],[82,139],[92,50],[111,62],[60,108],[58,139]],
  flyClosed:[[70,22],[70,38],[70,78],[67,55],[72,69],[80,108],[82,139],[73,55],[78,69],[60,108],[58,139]],
  flyBenchOpen:[[26,75],[42,75],[83,75],[50,55],[49,38],[103,64],[120,58],[50,95],[49,112],[103,86],[120,94]],
  flyBenchClosed:[[26,75],[42,75],[83,75],[52,65],[50,72],[103,64],[120,58],[52,85],[50,78],[103,86],[120,94]],
  rowReach:[[53,55],[53,70],[52,102],[78,80],[103,81],[89,112],[120,136]],
  rowPull:[[53,55],[53,70],[52,102],[44,87],[67,81],[89,112],[120,136]],
  chairRowReach:[[52,54],[52,68],[52,102],[78,75],[102,76],[86,108],[87,139]],
  chairRowPull:[[52,54],[52,68],[52,102],[44,84],[65,77],[86,108],[87,139]],
  faceReach:[[51,20],[51,34],[51,76],[76,41],[100,42],[55,109],[55,139]],
  facePull:[[51,20],[51,34],[51,76],[68,54],[64,32],[55,109],[55,139]],
  splitTop:[[78,19],[78,33],[77,75],[81,56],[82,81],[90,107],[92,139],[72,57],[70,81],[50,91],[30,105]],
  splitLow:[[78,41],[78,55],[77,95],[81,76],[82,101],[101,111],[96,139],[72,77],[70,101],[52,119],[30,105]],
  lungeLow:[[70,29],[70,43],[69,82],[74,63],[74,85],[105,108],[105,139],[64,63],[64,85],[43,128],[24,139]],
  lungeOpposite:[[70,29],[70,43],[69,82],[74,63],[74,85],[43,128],[24,139],[64,63],[64,85],[105,108],[105,139]],
  stepStart:[[64,23],[64,38],[64,79],[68,60],[68,83],[104,96],[105,108],[58,60],[57,83],[54,110],[54,139]],
  stepFinish:[[105,8],[105,23],[104,64],[109,45],[109,67],[105,86],[105,108],[99,45],[98,67],[81,93],[80,117]],
  legPressBent:[[35,78],[43,88],[68,111],[50,106],[57,112],[82,93],[100,91]],
  legPressStraight:[[35,78],[43,88],[68,111],[50,106],[57,112],[97,94],[122,76]],
  legExtDown:[[48,55],[48,69],[48,102],[59,86],[64,99],[81,107],[82,138]],
  legExtUp:[[48,55],[48,69],[48,102],[59,86],[64,99],[81,107],[120,107]],
  deadliftFloor:[[104,56],[93,65],[58,83],[95,94],[93,130],[82,110],[76,139]],
  rdlDown:[[101,45],[90,56],[58,78],[93,77],[94,103],[68,108],[70,139]],
  bridgeLow:[[29,122],[44,126],[78,131],[58,125],[77,128],[103,106],[103,138]],
  bridgeHigh:[[29,122],[44,123],[82,102],[61,114],[82,101],[105,105],[105,138]],
  hipLow:[[28,86],[42,91],[78,120],[59,105],[78,117],[103,106],[103,138]],
  hipHigh:[[28,86],[42,91],[82,99],[61,94],[82,97],[105,105],[105,138]],
  legCurlStart:[[48,55],[48,69],[48,102],[59,86],[64,99],[81,107],[121,108]],
  legCurlEnd:[[48,55],[48,69],[48,102],[59,86],[64,99],[81,107],[82,137]],
  backLow:[[25,121],[39,125],[80,130],[48,116],[44,107],[105,134],[130,139]],
  backHigh:[[25,91],[39,101],[80,130],[48,99],[44,89],[105,134],[130,139]],
  calfLow:[[68,19],[68,34],[68,76],[70,56],[71,80],[70,108],[70,137]],
  calfHigh:[[68,12],[68,27],[68,69],[70,49],[71,73],[70,101],[70,130]],
  calfSeatLow:[[48,55],[48,69],[48,102],[64,87],[81,94],[81,107],[83,138]],
  calfSeatHigh:[[48,55],[48,69],[48,102],[64,87],[81,94],[81,107],[83,130]],
  curlDown:[[70,19],[70,34],[70,76],[72,58],[75,81],[71,108],[72,139]],
  curlUp:[[70,19],[70,34],[70,76],[72,58],[86,43],[71,108],[72,139]],
  pushdownHigh:[[62,19],[62,34],[62,76],[64,58],[80,49],[64,108],[65,139]],
  pushdownLow:[[62,19],[62,34],[62,76],[64,58],[70,81],[64,108],[65,139]],
  tricepsLow:[[68,26],[68,40],[68,78],[66,15],[84,28],[70,109],[71,139]],
  tricepsHigh:[[68,26],[68,40],[68,78],[66,15],[66,3],[70,109],[71,139]],
  skullLow:[[29,65],[43,72],[80,73],[49,45],[36,50],[98,103],[102,138]],
  skullHigh:[[29,65],[43,72],[80,73],[49,45],[52,24],[98,103],[102,138]],
  wristLow:[[48,54],[48,68],[48,102],[65,94],[91,100],[81,107],[83,138]],
  wristHigh:[[48,54],[48,68],[48,102],[65,94],[91,90],[81,107],[83,138]],
  kneelTall:[[57,37],[57,52],[57,89],[70,56],[79,47],[59,119],[39,137]],
  kneelCurl:[[70,62],[66,76],[57,96],[78,77],[85,68],[59,119],[39,137]],
  hangKnees:[[70,63],[70,77],[70,108],[50,51],[52,28],[96,110],[102,129],[90,51],[88,28],[92,111],[98,130]],
  wheelStart:[[47,75],[51,89],[69,107],[70,108],[84,135],[76,132],[50,139]],
  wheelOut:[[98,95],[109,106],[84,119],[123,121],[138,135],[76,132],[50,139]],
  crunchFlat:[[27,119],[41,125],[80,132],[55,112],[71,109],[103,104],[103,138]],
  crunchUp:[[31,99],[44,109],[80,132],[57,103],[72,99],[103,104],[103,138]],
  pikeHigh:[[54,104],[61,116],[85,63],[63,126],[56,138],[109,96],[127,138]],
  pikeLow:[[49,119],[56,128],[85,66],[45,132],[56,138],[109,96],[127,138]],
  benchDipTop:[[61,53],[61,68],[68,100],[45,83],[40,96],[101,116],[121,138]],
  benchDipLow:[[61,76],[61,90],[68,121],[42,115],[40,96],[101,125],[121,138]],
  nordicTall:[[64,26],[64,40],[64,81],[70,58],[77,74],[65,119],[35,138]],
  nordicLow:[[107,56],[98,66],[78,95],[111,97],[125,134],[65,119],[35,138]],
  plank:[[27,101],[41,108],[84,112],[39,126],[51,138],[110,120],[136,137]],
  sidePlank:[[28,94],[42,102],[86,111],[42,124],[54,138],[110,120],[136,137]],
  hollow:[[28,115],[43,123],[79,133],[44,111],[57,103],[104,117],[130,108]],
  wallSit:[[48,38],[48,52],[48,90],[65,65],[78,70],[85,94],[85,138]],
  carryA:[[70,19],[70,34],[70,76],[74,56],[74,81],[88,108],[105,139],[65,56],[65,81],[52,105],[40,139]],
  carryB:[[70,19],[70,34],[70,76],[74,56],[74,81],[51,108],[39,139],[65,56],[65,81],[89,105],[103,139]],
  wallPushStart:[[49,54],[61,64],[83,91],[85,72],[105,72],[95,114],[110,138]],
  wallPushEnd:[[76,64],[89,74],[103,95],[96,91],[105,72],[105,116],[110,138]],
  chairSitting:[[49,55],[49,69],[49,102],[68,79],[85,83],[84,108],[84,139]],
  chairStanding:[[67,19],[67,34],[67,76],[83,48],[96,51],[70,108],[70,139]],
  marchDown:[[48,55],[48,69],[48,102],[67,83],[78,92],[82,108],[83,139]],
  marchUp:[[48,55],[48,69],[48,102],[67,83],[78,92],[85,92],[96,120]],
  apartIn:[[70,20],[70,34],[70,76],[61,38],[65,37],[79,108],[81,139],[79,38],[75,37],[61,108],[59,139]],
  apartOut:[[70,20],[70,34],[70,76],[48,39],[26,40],[79,108],[81,139],[92,39],[114,40],[61,108],[59,139]],
  deadBugStart:[[27,118],[41,126],[80,132],[40,105],[40,86],[90,104],[102,90]],
  deadBugEnd:[[27,118],[41,126],[80,132],[29,107],[16,98],[103,123],[130,129],[40,105],[40,86],[90,104],[102,90]],
  birdStart:[[28,91],[42,99],[82,105],[42,120],[42,137],[88,125],[71,139]],
  birdEnd:[[28,91],[42,99],[82,105],[28,92],[11,86],[103,103],[127,100],[42,120],[42,137],[88,125],[71,139]],
  catRound:[[32,87],[45,91],[82,95],[45,115],[45,139],[87,119],[69,139]],
  catArch:[[29,77],[43,88],[82,95],[43,114],[43,139],[87,119],[69,139]],
  heelBent:[[25,119],[39,125],[76,132],[51,130],[67,134],[100,106],[100,138]],
  heelStraight:[[25,119],[39,125],[76,132],[51,130],[67,134],[101,135],[130,139]],
  reachDown:[[70,19],[70,34],[70,76],[56,57],[55,80],[79,108],[81,139],[84,57],[85,80],[61,108],[59,139]],
  reachUp:[[70,29],[70,44],[70,80],[54,25],[52,8],[79,108],[81,139],[86,25],[88,8],[61,108],[59,139]],
  balance:[[68,19],[68,34],[68,76],[87,42],[104,46],[69,108],[69,139],[56,52],[54,75],[47,97],[46,119]],
  twistA:[[58,55],[58,69],[58,102],[48,85],[36,80],[91,108],[92,139],[68,85],[80,80],[87,108],[88,139]],
  twistB:[[65,55],[65,69],[58,102],[75,82],[88,79],[91,108],[92,139],[55,82],[44,79],[87,108],[88,139]],
  sledA:[[91,40],[83,53],[58,83],[99,59],[110,57],[75,107],[90,139],[96,62],[106,60],[41,110],[25,139]],
  sledB:[[91,40],[83,53],[58,83],[99,59],[110,57],[42,107],[26,139],[96,62],[106,60],[74,110],[90,139]],
  rowCatch:[[49,49],[49,63],[50,99],[73,75],[94,76],[88,105],[105,136]],
  rowFinish:[[34,45],[39,59],[55,100],[57,81],[70,69],[84,119],[105,136]],
  bikeA:[[62,35],[65,49],[59,83],[84,64],[100,60],[83,97],[90,120],[77,66],[98,61],[48,105],[63,119]],
  bikeB:[[62,35],[65,49],[59,83],[84,64],[100,60],[49,104],[63,119],[77,66],[98,61],[83,97],[90,120]],
  runA:[[68,20],[68,35],[65,74],[51,52],[43,69],[90,98],[100,128],[83,48],[92,36],[44,101],[28,118]],
  runB:[[68,20],[68,35],[65,74],[83,48],[92,36],[43,101],[28,118],[51,52],[43,69],[90,98],[100,128]]
};
const MOVEMENT_SCENES = {
  bench:['benchTop','benchLow','bench'], incline:['inclineTop','inclineLow','incline'],
  chestMachine:['chairPressIn','chairPressOut','chestMachine'], benchFly:['flyBenchOpen','flyBenchClosed','benchOverhead'],
  cableFly:['flyOpen','flyClosed','cablePair'], pushup:['pushHigh','pushLow','floor'],
  dip:['dipTop','dipLow','dip'], overhead:['pressLow','pressHigh','floor'],
  lateral:['lateralLow','lateralHigh','floor'], rearFly:['hingeHang','rearFlyHigh','floor'],
  pullup:['pullHang','pullTop','pullup'], pulldown:['pulldownTop','pulldownLow','pulldown'],
  hingeRow:['hingeHang','hingePull','floor'], supportedRow:['rowSupportedDown','rowSupportedUp','rowBench'],
  seatedRow:['rowReach','rowPull','rowingSeat'], supportedMachine:['hingeHang','hingePull','rowMachine'],
  facePull:['faceReach','facePull','floor'], squat:['squatTop','squatLow','floor'],
  legPress:['legPressBent','legPressStraight','legPress'], split:['splitTop','splitLow','splitBench'],
  lunge:['lungeLow','lungeOpposite','floor'], stepUp:['stepStart','stepFinish','step'],
  legExt:['legExtDown','legExtUp','chair'], deadlift:['deadliftFloor','stand','floor'],
  rdl:['stand','rdlDown','floor'], hipThrust:['hipLow','hipHigh','hipBench'],
  legCurl:['legCurlStart','legCurlEnd','chair'], backExt:['backLow','backHigh','floor'],
  calf:['calfLow','calfHigh','calfStep'], seatedCalf:['calfSeatLow','calfSeatHigh','calfSeat'],
  curl:['curlDown','curlUp','floor'], pushdown:['pushdownHigh','pushdownLow','floor'],
  overheadExt:['tricepsLow','tricepsHigh','floor'], skull:['skullLow','skullHigh','bench'],
  wristCurl:['wristLow','wristHigh','chair'], cableCrunch:['kneelTall','kneelCurl','floor'],
  hangingRaise:['pullHang','hangKnees','pullup'], abWheel:['wheelStart','wheelOut','floor'],
  crunch:['crunchFlat','crunchUp','floor'], pike:['pikeHigh','pikeLow','floor'],
  benchDip:['benchDipTop','benchDipLow','dipBench'], hang:['pullHang',null,'pullup'],
  nordic:['nordicTall','nordicLow','nordic'], bridge:['bridgeLow','bridgeHigh','floor'],
  plank:['plank',null,'floor'], sidePlank:['sidePlank',null,'floor'], hollow:['hollow',null,'floor'],
  wallSit:['wallSit',null,'wall'], carry:['carryA','carryB','floor'],
  chairRow:['chairRowReach','chairRowPull','chair'], chairPress:['chairPressIn','chairPressOut','chair'],
  wallPush:['wallPushStart','wallPushEnd','wallRight'], chairStand:['chairSitting','chairStanding','chair'],
  seatedMarch:['marchDown','marchUp','chair'], pullApart:['apartIn','apartOut','floor'],
  deadBug:['deadBugStart','deadBugEnd','floor'], birdDog:['birdStart','birdEnd','floor'],
  catCow:['catRound','catArch','floor'], heelSlide:['heelBent','heelStraight','floor'],
  reach:['reachDown','reachUp','floor'], balance:['balance',null,'support'], twist:['twistA','twistB','chair'],
  sled:['sledA','sledB','sled'], rower:['rowCatch','rowFinish','rower'],
  bike:['bikeA','bikeB','bike'], run:['runA','runB','floor']
};
MOVEMENT_POSES.rowSupportedDown = [[105,45],[94,57],[62,76],[94,78],[95,101],[69,99],[42,99],[91,77],[90,101],[55,108],[56,139]];
MOVEMENT_POSES.rowSupportedUp = [[105,45],[94,57],[62,76],[82,62],[79,72],[69,99],[42,99],[91,77],[90,101],[55,108],[56,139]];

function movementPose(id, guide, phase){
  const spec = MOVEMENT_SCENES[guide[0]], source = MOVEMENT_POSES[spec[phase ? 1 : 0]];
  const p = source.map(q => q.slice());
  // The near and far limbs are separate when a front view or asymmetry needs it.
  if(!p[7]) p[7]=[p[3][0]-4,p[3][1]+2];
  if(!p[8]) p[8]=[p[4][0]-4,p[4][1]+2];
  if(!p[9]) p[9]=[p[5][0]-6,p[5][1]];
  if(!p[10]) p[10]=[p[6][0]-6,p[6][1]];
  if(guide[0]==='squat' && guide[1]==='shoulderBar'){
    p[3]=[p[1][0]+14,p[1][1]+12]; p[4]=[p[1][0]+9,p[1][1]+3];
    p[7]=[p[3][0]-4,p[3][1]+2]; p[8]=[p[4][0]-4,p[4][1]+2];
  }
  if(guide[0]==='squat' && guide[1]==='goblet'){
    p[3]=[p[1][0]+12,p[1][1]+19]; p[4]=[p[1][0]+14,p[1][1]+10];
    p[7]=[p[3][0]-4,p[3][1]]; p[8]=[p[4][0]-3,p[4][1]];
  }
  if(guide[0]==='lateral' && guide[1]==='cable'){
    p[7]=[85,58]; p[8]=[88,81]; // one arm works; the other stays at the side
  }
  if(id==='cg-pulldown'){
    p[3]=[59,p[3][1]]; p[4]=[60,p[4][1]];
    p[7]=[71,p[7][1]]; p[8]=[70,p[8][1]];
  }
  if(id==='seated-leg-ext' || id==='seated-march'){
    p[9]=[81,108]; p[10]=[82,139]; // the supporting leg remains on the floor
  }
  if(id==='heel-slide'){p[9]=[100,106]; p[10]=[100,138];}
  if(id==='bw-calf'){p[9]=[53,p[2][1]+20]; p[10]=[52,p[2][1]+35];}
  if(guide[1]==='assisted'){
    p[5]=[p[2][0]+9,p[2][1]+23]; p[6]=[p[2][0]-14,p[2][1]+28];
    p[9]=[p[2][0]+3,p[2][1]+23]; p[10]=[p[2][0]-20,p[2][1]+28];
  }
  // On a bench fly the diagram is a top view; the two hands move symmetrically.
  return p;
}
function movementBody(p, scene, load){
  const [h,s,hip,e,w,k,a,er,wr,kr,ar] = p;
  const dx=hip[0]-s[0], dy=hip[1]-s[1], len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
  const pt=(v,n) => (v[0]+nx*n).toFixed(1)+' '+(v[1]+ny*n).toFixed(1);
  const chain=(points,cls) => '<path class="'+cls+'" d="M'+points.map(q=>q.map(v=>+v.toFixed(1)).join(' ')).join(' L')+'"/>';
  const foot = (q,back) => [q[0]+(back?8:10), (scene==='calf' || scene==='seatedCalf') && !(load==='single' && back) ? 139 : q[1]];
  const torso = scene==='catCow'
    ? '<path class="mov-cat" d="M'+s.join(' ')+' Q'+((s[0]+hip[0])/2)+' '+(s[1]<90?105:72)+' '+hip.join(' ')+'"/>'
    : '<path class="mov-torso" d="M'+pt(s,9)+' Q'+pt(hip,10)+' '+pt(hip,8)+' L'+pt(hip,-8)+' Q'+pt(s,-10)+' '+pt(s,-9)+' Z"/>';
  return chain([hip,kr,ar,foot(ar,true)], 'mov-leg rear') +
    chain([s,er,wr], 'mov-arm rear') + chain([h,s], 'mov-neck') +
    chain([hip,k,a,foot(a,false)], 'mov-leg') + torso +
    chain([s,e,w], 'mov-arm') + '<ellipse class="mov-head" cx="'+h[0].toFixed(1)+'" cy="'+h[1].toFixed(1)+'" rx="8.5" ry="10"/>';
}
function movementBackdrop(base, guide, p){
  let out=base==='benchOverhead'?'':'<path class="mov-floor" d="M10 141H150"/>';
  const line = d => '<path class="mov-prop" d="'+d+'"/>';
  const pad = (x,y,w,h) => '<rect class="mov-pad" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2"/>';
  if(base==='bench') out+=line('M20 82H94 M31 84V137 M85 84V137');
  if(base==='incline') out+=line('M33 52L77 85H98 M43 63L39 138 M86 85V138');
  if(base==='benchOverhead') out+=pad(15,62,82,26);
  if(base==='chair'||base==='calfSeat'||base==='chestMachine'||base==='pulldown') out+=line('M34 59V108H81 M38 109V137 M75 109V137');
  if(base==='hipBench') out+=line('M10 101H52 M17 103V138 M46 103V138');
  if(base==='rowBench') out+=line('M28 104H99 M37 106V138 M90 106V138');
  if(base==='splitBench') out+=line('M10 108H45 M17 110V138 M39 110V138');
  if(base==='dipBench') out+=line('M10 99H43 M16 101V138 M37 101V138');
  if(base==='step') out+=line('M92 112H139V139');
  if(base==='calfStep') out+=line('M64 141H99');
  if(base==='calfSeat') out+=line('M73 140H101 M72 99H95');
  if(base==='wall') out+=line('M39 20V139');
  if(base==='wallRight') out+=line('M111 21V139');
  if(base==='support') out+=line('M112 48V138 M103 48H122');
  if(base==='dip') out+=line('M36 78H55 M39 80V139 M32 139H48');
  if(base==='pullup') out+=line('M25 27H115');
  if(base==='rowingSeat') out+=line('M29 109H64 M35 111V138 M19 139H133 M125 110L134 137');
  if(base==='rowMachine') out+=line('M80 69L57 88 M68 80L47 139 M124 37V139 H135 M108 75L126 60');
  if(base==='chestMachine') out+=line('M127 30V138 H141 M127 42H111 M129 64L'+p[4][0]+' '+p[4][1]);
  if(base==='pulldown') out+=line('M127 18V139 H141 M126 18H65');
  if(base==='legPress') out+=line('M24 91L69 126 M31 96L26 137 M77 128L126 141 M'+(p[6][0]-6)+' '+(p[6][1]-20)+'l25 34');
  if(base==='nordic') out+=line('M13 138H56 M26 132V139');
  if(base==='sled') out+=line('M108 58L113 132 H141 M110 57V37 M131 132V91 M122 130H141');
  if(base==='rower') out+=line('M15 140H129 M34 108H63 M115 106L126 137 M120 99Q138 98 138 117Q138 133 122 133Q106 133 106 117Q106 99 120 99Z');
  if(base==='rower') out+='<path class="mov-cable" d="M120 112L'+p[4][0]+' '+p[4][1]+'"/>';
  if(base==='bike') out+=line('M36 89A25 25 0 1 0 36 139A25 25 0 1 0 36 89 M116 89A25 25 0 1 0 116 139A25 25 0 1 0 116 89 M36 114L59 83L76 114H36 M76 114L99 61L116 114 M50 82H67 M94 60H108');
  if(guide[1]==='assisted') out+=line('M119 26V139 H137 M'+(p[5][0]-15)+' '+(p[5][1]+7)+'H119');
  if(guide[1]==='machine' && (base==='chair'||base==='calfStep'||base==='calfSeat')) out+=line('M128 38V139 H139 M120 73H129');
  if(guide[1]==='machine' && base==='calfStep') out+=line('M54 '+(p[1][1]-5)+'H82');
  return out;
}
function movementLoad(type, p, scene){
  const h=p[0], s=p[1], hip=p[2], w=p[4], wr=p[8];
  const line=(d,cls='mov-load') => '<path class="'+cls+'" d="'+d+'"/>';
  const bar=(x,y) => line('M'+(x-22)+' '+y+'h44 M'+(x-17)+' '+(y-8)+'v16 M'+(x+17)+' '+(y-8)+'v16');
  const dumb=(x,y) => line('M'+(x-7)+' '+y+'h14 M'+(x-6)+' '+(y-5)+'v10 M'+(x+6)+' '+(y-5)+'v10');
  const cable=(ax,ay,x,y,band) => line('M'+ax+' '+ay+'L'+x+' '+y,band?'mov-band':'mov-cable');
  let out='';
  if(type==='bar') out+=bar(scene==='overhead'?(w[0]+wr[0])/2:w[0],w[1]);
  if(type==='shoulderBar') out+=bar(s[0],s[1]+2);
  if(type==='hipBar') out+=bar(hip[0],hip[1]-3);
  if(type==='goblet'||type==='chestWeight') out+=dumb(w[0],w[1]);
  if(type==='dumbbell'){
    out+=dumb(w[0],w[1]);
    if(['lateral','benchFly','overhead','carry','lunge','split','stepUp'].indexOf(scene)>=0) out+=dumb(wr[0],wr[1]);
  }
  if(type==='machine' && (scene==='legExt'||scene==='legCurl')){
    out+=line('M128 107L'+p[6][0]+' '+p[6][1],'mov-cable')+'<circle class="mov-wheel" cx="'+p[6][0]+'" cy="'+p[6][1]+'" r="5"/>';
  }
  if(type==='wheel') out+='<circle class="mov-wheel" cx="'+w[0]+'" cy="'+(w[1]-2)+'" r="7"/>';
  if(type==='added') out+=line('M'+hip[0]+' '+(hip[1]+3)+'v9 m-6 0h12v12h-12z');
  if(type==='cable'){
    if(scene==='cableFly') out+=cable(13,31,w[0],w[1])+cable(127,31,wr[0],wr[1])+line('M13 26V138 M127 26V138','mov-prop');
    else if(scene==='pulldown') out+=cable(65,18,(w[0]+wr[0])/2,w[1])+line('M'+(w[0]-4)+' '+w[1]+'H'+(wr[0]+4));
    else if(scene==='lateral') out+=cable(17,137,w[0],w[1])+line('M17 31V139','mov-prop');
    else out+=cable(135,scene==='facePull'?40:81,w[0],w[1])+line('M135 30V139','mov-prop');
  }
  if(type==='cableLow'||type==='bandLow') out+=cable(type==='bandLow'?61:24,139,w[0],w[1],type==='bandLow')+(type==='cableLow'?line('M24 35V139 H35','mov-prop'):'');
  if(type==='cableHigh'||type==='bandHigh') out+=cable(126,15,w[0],w[1],type==='bandHigh')+(type==='cableHigh'?line('M126 15V139','mov-prop'):'');
  if(type==='band'){
    if(scene==='pullApart') out+=cable(w[0],w[1],wr[0],wr[1],true);
    else out+=cable(scene==='chairPress'?15:135,scene==='chairPress'?72:76,w[0],w[1],true);
  }
  return out;
}
function movementStage(guide, p){
  const spec=MOVEMENT_SCENES[guide[0]];
  return movementBackdrop(spec[2],guide,p)+movementBody(p,guide[0],guide[1])+movementLoad(guide[1],p,guide[0]);
}
function movementMixed(a,b,f){return a.map((v,i)=>v.map((n,j)=>n+(b[i][j]-n)*f));}
function movementReduced(){return document.documentElement.getAttribute('data-motion')==='on';}
const movementPlayers = new WeakMap();
function playMovement(button){
  const box=button.closest('.movement-guide');
  const guide=box && MOVEMENT_GUIDES[box.getAttribute('data-exercise')];
  if(!guide || movementReduced()) return;
  let player=movementPlayers.get(button);
  if(player && player.running){
    cancelAnimationFrame(player.frame); player.running=false; player.last=0;
    button.textContent=t('movement.resume'); return;
  }
  if(!player || player.elapsed>=3200){
    player={running:false,elapsed:0,last:0,frame:0}; movementPlayers.set(button,player);
  }
  player.running=true; button.textContent=t('movement.pause');
  const a=movementPose(box.getAttribute('data-exercise'),guide,0), b=movementPose(box.getAttribute('data-exercise'),guide,1);
  const target=box.querySelector('[data-moving]');
  function tick(time){
    if(!player.running || !box.isConnected) return;
    if(document.hidden || movementReduced()){
      player.running=false; player.last=0; button.textContent=t('movement.resume'); return;
    }
    if(player.last) player.elapsed+=Math.min(time-player.last,50);
    player.last=time;
    const raw=Math.min(player.elapsed/3200,1), progress=raw<.5?raw*2:(1-raw)*2;
    const eased=progress*progress*(3-2*progress);
    target.innerHTML=movementStage(guide,movementMixed(a,b,eased));
    if(raw<1) player.frame=requestAnimationFrame(tick);
    else {player.running=false; player.last=0; button.textContent=t('movement.replay');}
  }
  player.frame=requestAnimationFrame(tick);
}
ACT('movementPlay', el => playMovement(el));

function exerciseMovement(ex){
  const guide=ex && MOVEMENT_GUIDES[ex.id];
  // Safe fallback for future exercises: useful text, never a misleading image.
  if(!guide) return '<div class="movement-guide"><p class="body-sm">'+esc(t('cue.'+ex.id))+'</p></div>';
  const mode=guide[3]||'reps', hold=mode==='hold', rtl=document.documentElement.dir==='rtl';
  const a=movementPose(ex.id,guide,0), b=hold?null:movementPose(ex.id,guide,1);
  const first=hold?0:(rtl?160:0), second=rtl?0:160;
  const firstLabel=hold?t('movement.hold'):mode==='stride'?t('movement.strideA'):t('movement.start');
  const secondLabel=mode==='stride'?t('movement.strideB'):t('movement.end');
  const control=hold?'movement.controlHold':mode==='stride'?'movement.controlStride':'movement.control';
  return '<section class="movement-guide" data-exercise="'+escAttr(ex.id)+'" aria-label="'+escAttr(t('movement.title'))+'">'+
    '<div class="move-heading">'+esc(t('movement.title'))+'</div>'+
    (guide[0]==='benchFly'?'<p class="movement-view">'+esc(t('movement.viewAbove'))+'</p>':'')+
    '<div class="move-labels'+(hold?' is-hold':'')+'"><span>'+esc(firstLabel)+'</span>'+(hold?'':'<span>'+esc(secondLabel)+'</span>')+'</div>'+
    '<svg class="movement-figure'+(hold?' is-hold':'')+'" viewBox="0 -10 '+(hold?160:320)+' 160" aria-hidden="true" focusable="false">'+
      '<g data-moving transform="translate('+first+' 0)">'+movementStage(guide,a)+'</g>'+
      (hold?'':'<g transform="translate('+second+' 0)">'+movementStage(guide,b)+'</g>')+'</svg>'+
    (hold?'':'<button class="movement-play" type="button" data-act="movementPlay">'+esc(t('movement.play'))+'</button>')+
    '<div class="move-copy"><p>'+esc(t('movement.guide.'+guide[2]))+'</p>'+
      '<p><b>'+esc(t('movement.tip'))+'</b> '+esc(t('cue.'+ex.id))+'</p>'+
      '<p><b>'+esc(t('movement.controlLabel'))+'</b> '+esc(t(control))+'</p></div></section>';
}
