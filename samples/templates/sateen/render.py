"""Рендер макета по шаблону (КПБ, страйп-сатин и любые рисунки).
render(tdir, out, design=..., rapport_cm=..., scale, rot)            — рисунок дизайнера
render(tdir, out, stripes=[(ширина_см, '#hex', блестящая), ...])      — генератор страйпа
"""
import cv2,numpy as np,json,math
def hex2bgr(h): h=h.lstrip('#'); return np.array([int(h[4:6],16),int(h[2:4],16),int(h[0:2],16)],np.float32)/255
def _grid(z,w,h):
    g=z['uvGrid']; U=np.array(g['u'],np.float32).reshape(g['rows'],g['cols']); V=np.array(g['v'],np.float32).reshape(g['rows'],g['cols'])
    bw=(g['cols']-1)*g['step']+1; bh=(g['rows']-1)*g['step']+1
    Uf=cv2.resize(U,(bw,bh),interpolation=cv2.INTER_LINEAR); Vf=cv2.resize(V,(bw,bh),interpolation=cv2.INTER_LINEAR)
    x0,y0=g['x0'],g['y0']; xa,ya=max(0,x0),max(0,y0); xb,yb=min(w,x0+bw),min(h,y0+bh)
    return Uf[ya-y0:yb-y0,xa-x0:xb-x0],Vf[ya-y0:yb-y0,xa-x0:xb-x0],(xa,ya,xb,yb)
def render(tdir,out,design=None,rapport_cm=None,stripes=None,scale=1.0,rot=0.0,weave_contrast=1.0,gloss_strength=None,per_zone=None,stripe_axis='v'):
    T=json.load(open(f'{tdir}/template.json')); sateen=T.get('finish')=='sateen'
    base=cv2.imread(f"{tdir}/background.jpg").astype(np.float32)/255; h,w=base.shape[:2]
    if gloss_strength is None: gloss_strength=0.35 if sateen else 0.0
    if design: tile=cv2.imread(design).astype(np.float32)/255; th,tw=tile.shape[:2]
    if stripes:
        P=sum(s[0] for s in stripes); edges=np.cumsum([0]+[s[0] for s in stripes])
        cols=[hex2bgr(s[1]) for s in stripes]; shiny=[1.0 if s[2] else -1.0 for s in stripes]
    col=np.zeros_like(base); sh=np.zeros((h,w),np.float32); wv=np.zeros((h,w),np.float32); gl=np.zeros((h,w),np.float32); band=np.zeros((h,w),np.float32); A=np.zeros((h,w),np.float32)
    for z in T['zones']:
        p=dict(scale=scale,rot=rot,du=0.0,dv=0.0)
        if per_zone and z['id'] in per_zone: p.update(per_zone[z['id']])
        U,V,(xa,ya,xb,yb)=_grid(z,w,h)
        c,s=math.cos(math.radians(p['rot'])),math.sin(math.radians(p['rot']))
        uu=(U+p['du'])*c-(V+p['dv'])*s; vv=(U+p['du'])*s+(V+p['dv'])*c
        m=cv2.imread(f"{tdir}/{z['mask']}",0)[ya:yb,xa:xb]>127
        if design:
            pxcm=tw/(rapport_cm*p['scale'])
            src=tile; dens=pxcm/z['pxPerCm']
            if dens>1.6: src=cv2.GaussianBlur(tile,(0,0),dens*0.4)
            smp=cv2.remap(src,np.mod(uu*pxcm,tw).astype(np.float32),np.mod(vv*pxcm,th).astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
            bsub=np.zeros(m.shape,np.float32)
        else:
            t=np.mod((vv if stripe_axis=='v' else uu)/p['scale'],P)
            aa=max(0.6/z['pxPerCm']/p['scale'],1e-3)          # сглаживание края полосы ~0.6 px
            smp=np.zeros(m.shape+(3,),np.float32); bsub=np.zeros(m.shape,np.float32); wsum=np.zeros(m.shape,np.float32)
            for i in range(len(stripes)):
                a0,a1=edges[i],edges[i+1]
                wgt=np.clip((t-a0)/aa+0.5,0,1)*np.clip((a1-t)/aa+0.5,0,1)
                if i==0: wgt=np.maximum(wgt,np.clip((t-P)/aa+0.5,0,1))
                if i==len(stripes)-1: wgt=np.maximum(wgt,np.clip((0-t)/aa+0.5,0,1)) if False else wgt
                smp+=wgt[...,None]*cols[i]; bsub+=wgt*shiny[i]; wsum+=wgt
            smp/=np.maximum(wsum,1e-4)[...,None]; bsub/=np.maximum(wsum,1e-4)
        def put(dst,val):
            sub=dst[ya:yb,xa:xb]; sub[m]=val[m]
        put(col,smp); put(band,bsub); put(A,np.ones(m.shape,np.float32))
        put(sh,cv2.imread(f"{tdir}/{z['shade']}",0)[ya:yb,xa:xb].astype(np.float32)/255*1.5)
        if 'weave' in z: put(wv,cv2.imread(f"{tdir}/{z['weave']}",0)[ya:yb,xa:xb].astype(np.float32)/255*0.5)
        if 'gloss' in z: put(gl,cv2.imread(f"{tdir}/{z['gloss']}",0)[ya:yb,xa:xb].astype(np.float32)/255)
    sh=np.where(sh>1.0,1.0+(sh-1.0)*0.55,sh)
    weave=1+weave_contrast*wv*band                         # блестящая/матовая полоса сатина
    rng=np.random.default_rng(1); grain=cv2.GaussianBlur(rng.normal(0,1,(h,w)).astype(np.float32),(0,0),0.7); grain=1+(0.008 if sateen else 0.02)*grain/grain.std()
    fab=np.clip(col*(sh*weave*grain)[...,None]*np.array(T['tint_bgr'],np.float32),0,1)
    g=(gl*gloss_strength*(0.6+0.4*np.clip(band,0,1)))[...,None]
    fab=1-(1-fab)*(1-g*np.array([0.97,0.98,1.0],np.float32))   # сатиновый блеск (screen)
    a=cv2.GaussianBlur(A,(0,0),0.9)[...,None]
    res=base*(1-a)+fab*a
    cv2.imwrite(out,(np.clip(res,0,1)*255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,92])
