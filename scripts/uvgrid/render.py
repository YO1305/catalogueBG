"""Эталонный рендер ZIP-шаблона (SPEC 5.7.4). TypeScript-версия: uvgridRender.ts — должна давать то же.
render(tdir, out, design=..., tile_w_cm=..., tile_h_cm=..., scale, rot)  — рисунок дизайнера
render(tdir, out, stripes=[(ширина_см, '#hex', блестящая), ...])         — генератор страйпа (finish: sateen)
render(tdir, out, weave_color='#hex', weave_stripes=[(см, блестящая),...] | weave_map='схема.png' | ничего) — жаккард/страйп-сатин: только цвет + узор
"""
import cv2,numpy as np,json,math
def hex2rgb(h): h=h.lstrip('#'); return np.array([int(h[0:2],16),int(h[2:4],16),int(h[4:6],16)],np.float32)/255
def gauss(img,s,wrap=False):
    if s<=0: return img
    k=int(math.ceil(s*3)); x=np.arange(-k,k+1,dtype=np.float32); w=np.exp(-x*x/(2*s*s)); w/=w.sum()
    out=img.astype(np.float32)
    for ax in (1,0):
        acc=np.zeros_like(out)
        for i,wi in zip(x.astype(int),w):
            if wrap: acc+=wi*np.roll(out,-i,axis=ax)
            else:
                idx=np.clip(np.arange(out.shape[ax])+i,0,out.shape[ax]-1)
                acc+=wi*np.take(out,idx,axis=ax)
        out=acc
    return out
def tile_plan(sigma):
    if sigma<=0: return 1,0.0
    d=max(1,int(math.floor(sigma/1.5))); return d,max(0.25,round(sigma/d*4)/4)
def prepare_tile(tile,sigma):
    d,s=tile_plan(sigma); th,tw=tile.shape[:2]; w,h=max(1,tw//d),max(1,th//d)
    t=tile[:h*d,:w*d].reshape(h,d,w,d,3).mean(axis=(1,3)) if d>1 else tile
    t=np.round(t*255*d*d)/(255*d*d) if d>1 else t
    return (gauss(t,s,wrap=True) if s>0 else t).astype(np.float32),w,h
def grid_to_px(z,w,h):
    """Узел (i,j) сетки = пиксель (x0+i*step, y0+j*step). Билинейно, точно по узлам."""
    g=z['uvGrid']; cols,rows,step=g['cols'],g['rows'],g['step']
    U=np.array(g['u'],np.float32).reshape(rows,cols); V=np.array(g['v'],np.float32).reshape(rows,cols)
    xa,ya=max(0,g['x0']),max(0,g['y0']); xb=min(w,g['x0']+(cols-1)*step+1); yb=min(h,g['y0']+(rows-1)*step+1)
    xs=(np.arange(xa,xb,dtype=np.float32)-g['x0'])/step; ys=(np.arange(ya,yb,dtype=np.float32)-g['y0'])/step
    X,Y=np.meshgrid(xs,ys)
    Uf=cv2.remap(U,X,Y,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE); Vf=cv2.remap(V,X,Y,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    return Uf,Vf,(xa,ya,xb,yb)
def render(tdir,out=None,design=None,tile_w_cm=None,tile_h_cm=None,stripes=None,weave_color=None,weave_stripes=None,weave_map=None,map_w_cm=10,map_h_cm=None,scale=1.0,rot=0.0,
           weave_contrast=1.0,gloss_strength=None,grain=None,per_zone=None,seed=1):
    T=json.load(open(f'{tdir}/template.json')); sateen=T.get('finish')=='sateen'
    rd=lambda p,flag=cv2.IMREAD_COLOR: cv2.imread(f'{tdir}/{p}',flag)
    base=cv2.cvtColor(rd(T.get('background','background.jpg')),cv2.COLOR_BGR2RGB).astype(np.float32)/255; h,w=base.shape[:2]
    if gloss_strength is None: gloss_strength=0.35 if sateen else 0.0
    if grain is None: grain=0.008 if sateen else 0.02
    tint=np.array(T.get('tint_bgr',[1,1,1]),np.float32)[::-1]
    wcol=hex2rgb(weave_color) if weave_color else None
    if wcol is not None and weave_stripes: stripes=[(w_,weave_color,sh_) for w_,sh_ in weave_stripes]; wcol=None
    if wcol is not None and weave_map: design=weave_map; tile_w_cm=map_w_cm; tile_h_cm=map_h_cm
    if design:
        tile=cv2.cvtColor(cv2.imread(design),cv2.COLOR_BGR2RGB).astype(np.float32)/255; th,tw=tile.shape[:2]
        if tile_h_cm is None: tile_h_cm=tile_w_cm*th/tw
    if stripes:
        P=sum(s[0] for s in stripes); edges=np.cumsum([0]+[s[0] for s in stripes])
        cols=[hex2rgb(s[1]) for s in stripes]; sgn=[1.0 if s[2] else -1.0 for s in stripes]
    LT=np.ones_like(base)
    SOFTA=np.zeros((h,w),np.float32)
    col=np.zeros_like(base); sh=np.zeros((h,w),np.float32); wv=np.zeros((h,w),np.float32); gl=np.zeros((h,w),np.float32)
    band=np.zeros((h,w),np.float32); A=np.zeros((h,w),np.float32)
    for z in T['zones']:
        p=dict(scale=scale,rot=rot,du=0.0,dv=0.0)
        if per_zone and z['id'] in per_zone: p.update(per_zone[z['id']])
        U,V,(xa,ya,xb,yb)=grid_to_px(z,w,h)
        c,s=math.cos(math.radians(p['rot'])),math.sin(math.radians(p['rot']))
        uu=(U+p['du'])*c-(V+p['dv'])*s; vv=(U+p['du'])*s+(V+p['dv'])*c
        mraw=rd(z['mask'],0)[ya:yb,xa:xb]
        if T.get('softMasks'):
            sub=SOFTA[ya:yb,xa:xb]; m=(mraw>0)&(mraw.astype(np.float32)/255>=sub); sub[m]=mraw[m].astype(np.float32)/255
        else: m=mraw>127
        if design:
            dens=max(tw/(tile_w_cm*p['scale']),th/(tile_h_cm*p['scale']))/z['pxPerCm']
            src,sw,sh_=prepare_tile(tile,dens*0.4 if dens>1.6 else 0)
            pxX=sw/(tile_w_cm*p['scale']); pxY=sh_/(tile_h_cm*p['scale'])
            smp=cv2.remap(src,np.mod(uu*pxX,sw).astype(np.float32),np.mod(vv*pxY,sh_).astype(np.float32),cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
            bs=np.zeros(m.shape,np.float32)
            if wcol is not None:
                bs=(0.299*smp[...,0]+0.587*smp[...,1]+0.114*smp[...,2])*2-1
                smp=np.broadcast_to(wcol,smp.shape).astype(np.float32)
        elif wcol is not None:
            smp=np.broadcast_to(wcol,m.shape+(3,)).astype(np.float32); bs=np.zeros(m.shape,np.float32)
        else:
            t=np.mod(vv/p['scale'],P); aa=max(0.6/z['pxPerCm']/p['scale'],1e-3)
            smp=np.zeros(m.shape+(3,),np.float32); bs=np.zeros(m.shape,np.float32); ws=np.zeros(m.shape,np.float32)
            for i in range(len(stripes)):
                a0,a1=edges[i],edges[i+1]
                wg=np.clip((t-a0)/aa+0.5,0,1)*np.clip((a1-t)/aa+0.5,0,1)
                if i==0: wg=np.maximum(wg,np.clip((t-P)/aa+0.5,0,1))
                smp+=wg[...,None]*cols[i]; bs+=wg*sgn[i]; ws+=wg
            smp/=np.maximum(ws,1e-4)[...,None]; bs/=np.maximum(ws,1e-4)
        def put(dst,val): sub=dst[ya:yb,xa:xb]; sub[m]=val[m]
        put(col,smp); put(band,bs); put(A,np.ones(m.shape,np.float32))
        put(sh,rd(z['shade'],0)[ya:yb,xa:xb].astype(np.float32)/255*1.5)
        if z.get('weave'): put(wv,rd(z['weave'],0)[ya:yb,xa:xb].astype(np.float32)/255*0.5)
        if z.get('light'): put(LT,cv2.cvtColor(rd(z['light']),cv2.COLOR_BGR2RGB)[ya:yb,xa:xb].astype(np.float32)/127.5)
        if z.get('gloss'): put(gl,rd(z['gloss'],0)[ya:yb,xa:xb].astype(np.float32)/255)
    knee=T.get('shadeKnee',1.0); sh=np.where(sh>knee,knee+(sh-knee)*0.55,sh)
    weave=1+weave_contrast*wv*band
    if grain>0:
        yy,xx=np.mgrid[0:h,0:w].astype(np.uint32)
        with np.errstate(over='ignore'):
            hh=(xx*np.uint32(73856093))^(yy*np.uint32(19349663))^(np.uint32(seed)*np.uint32(83492791))
            hh=(hh^(hh>>np.uint32(16)))*np.uint32(0x45d9f3b)
            hh=(hh^(hh>>np.uint32(16)))*np.uint32(0x45d9f3b)
            hh=hh^(hh>>np.uint32(16))
        n=hh.astype(np.float64)/4294967296*2-1
        gr=(1+grain*n/0.57735).astype(np.float32)
    else: gr=1.0
    fab=col*(sh*weave*gr)[...,None]*tint*LT
    if T.get('highlightRolloff'): fab=np.where(fab<=0.85,fab,0.85+0.15*np.tanh((fab-0.85)/0.15))
    fab=np.clip(fab,0,1)
    g=(gl*gloss_strength*(0.6+0.4*np.clip(band,0,1)))[...,None]
    fab=1-(1-fab)*(1-g*np.array([1.0,0.98,0.97],np.float32))
    a=(SOFTA if T.get('softMasks') else A*gauss(A,1.0))[...,None]
    res=np.clip(base*(1-a)+fab*a,0,1)
    if out: cv2.imwrite(out,cv2.cvtColor((res*255+0.5).astype(np.uint8),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,92])
    return res
