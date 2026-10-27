import cairosvg, io
from PIL import Image
W,H = 200,470

SIL = ['M64,86 L136,86 L148,122 L132,186 L130,228 L100,256 L70,228 L68,186 L52,122 Z',
       'M58,88 C48,94 44,112 46,130 L41,200 L37,280 L50,286 L55,204 L60,150 L68,106 Z',
       'M142,88 C152,94 156,112 154,130 L159,200 L163,280 L150,286 L145,204 L140,150 L132,106 Z',
       'M70,224 L99,252 L95,352 L89,438 L75,440 L73,352 L67,290 Z',
       'M130,224 L101,252 L105,352 L111,438 L125,440 L127,352 L133,290 Z',
       'M87,52 L113,52 L116,80 L84,80 Z']
HEAD_E = (100,34,20,25)

BI_L,R_ = 'M48,134 L62,130 L55,194 L45,196 Z','M152,134 L138,130 L145,194 L155,196 Z'
FA_L,FA_R = 'M43,208 L53,206 L49,276 L41,278 Z','M157,208 L147,206 L151,276 L159,278 Z'
DL_L,DL_R = 'M58,88 C48,94 43,112 46,132 L64,126 C61,112 60,100 60,88 Z','M142,88 C152,94 157,112 154,132 L136,126 C139,112 140,100 140,88 Z'

REGIONS = {
 'front':{
  'shoulders':[DL_L,DL_R],
  'chest':['M62,94 L99,94 L99,146 C86,152 70,146 63,136 Z','M138,94 L101,94 L101,146 C114,152 130,146 137,136 Z'],
  'biceps':[BI_L,R_],
  'forearms':[FA_L,FA_R],
  'abs':['M84,152 L116,152 L118,208 L82,208 Z','M68,146 L82,152 L82,204 L70,196 Z','M132,146 L118,152 L118,204 L130,196 Z'],
  'quads':['M70,256 L96,256 L93,350 L71,348 Z','M130,256 L104,256 L107,350 L129,348 Z'],
  'calves':['M74,362 L92,362 L89,432 L78,434 Z','M126,362 L108,362 L111,432 L122,434 Z'],
 },
 'back':{
  'shoulders':[DL_L,DL_R],
  'back':['M88,90 L112,90 L138,98 L116,128 L84,128 L62,98 Z',
          'M66,124 L98,124 L96,172 C86,182 74,174 67,160 Z',
          'M134,124 L102,124 L104,172 C114,182 126,174 133,160 Z'],
  'lowerback':['M84,176 L116,176 L118,214 L82,214 Z'],
  'triceps':[BI_L,R_],
  'forearms':[FA_L,FA_R],
  'glutes':['M70,216 L130,216 L128,252 C112,260 88,260 72,252 Z'],
  'hamstrings':['M72,264 L96,264 L93,350 L71,348 Z','M128,264 L104,264 L107,350 L129,348 Z'],
  'calves':['M73,362 L93,362 L87,436 L75,436 Z','M127,362 L107,362 L113,436 L125,436 Z'],
 }
}

def mask(paths, ellipse=None):
    body = ''.join('<path d="%s" fill="#000"/>'%p for p in paths)
    if ellipse:
        cx,cy,rx,ry = ellipse
        body += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#000"/>'%(cx,cy,rx,ry)
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><rect width="%d" height="%d" fill="#fff"/>%s</svg>'%(W,H,W*2,H*2,W,H,body)
    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('L').resize((W,H), Image.NEAREST)
    return [1 if im.getpixel((x,y))<128 else 0 for y in range(H) for x in range(W)]

sil = mask(SIL, HEAD_E)
print('silhouette: %.1f%% of canvas\n' % (100*sum(sil)/(W*H)))
fails, warns = [], []
for side, groups in REGIONS.items():
    print('--- %s ---' % side.upper())
    acc=[0]*(W*H)
    for name, paths in groups.items():
        m = mask(paths); n = sum(m)
        inside = sum(1 for i,v in enumerate(m) if v and sil[i]); pct = 100*inside/max(1,n)
        sym=''
        if len(paths)==2:
            dif = sum(1 for y in range(H) for x in range(W//2) if m[y*W+x]!=m[y*W+(W-1-x)])
            sym = ' mirror-diff %.1f%%'%(100*dif/max(1,n))
            if 100*dif/max(1,n) > 10: warns.append('%s/%s asymmetric'%(side,name))
        ov = 100*sum(1 for i,v in enumerate(m) if v and acc[i])/max(1,n)
        acc=[1 if (acc[i] or m[i]) else 0 for i in range(W*H)]
        print('  %-11s area %5d  in-body %6.2f%%  overlap %5.2f%%%s'%(name,n,pct,ov,sym))
        if pct < 97: fails.append('%s/%s: %.1f%% inside body'%(side,name,pct))
        if ov > 3: warns.append('%s/%s overlaps by %.1f%%'%(side,name,ov))
        if n < 200: warns.append('%s/%s too small (%dpx)'%(side,name,n))
print('\n================ RESULT ================')
print('\n'.join('  FAIL '+f for f in fails) if fails else '  All regions sit inside the body silhouette.')
print('\n'.join('  WARN '+w for w in warns) if warns else '  No overlap or symmetry warnings.')
