"""Рендер макета по шаблону: python3 render.py template design.png rapport_cm out.jpg [scale] [rotation_deg]"""
import cv2,numpy as np,json,sys,math
def render(tdir,design,rapport_cm,out,scale=1.0,rot=0.0,zone_overrides=None):
    T=json.load(open(f'{tdir}/template.json'))
    base=cv2.imread(f"{tdir}/background.jpg").astype(np.float32)/255
    tile=cv2.imread(design).astype(np.float32)/255; th,tw=tile.shape[:2]
    tint=np.array(T['tint_bgr'],np.float32)
    h,w=base.shape[:2]
    pat=np.zeros_like(base); sh=np.zeros((h,w),np.float32); hard=np.zeros((h,w),np.float32)
    for z in T['zones']:
        p=dict(scale=scale,rot=rot,du=0,dv=0)
        if zone_overrides and z['id'] in zone_overrides: p.update(zone_overrides[z['id']])
        g=z['uvGrid']; U=np.array(g['u'],np.float32).reshape(g['rows'],g['cols']); V=np.array(g['v'],np.float32).reshape(g['rows'],g['cols'])
        bw=(g['cols']-1)*g['step']+1; bh=(g['rows']-1)*g['step']+1
        Uf=cv2.resize(U,(bw,bh),interpolation=cv2.INTER_LINEAR); Vf=cv2.resize(V,(bw,bh),interpolation=cv2.INTER_LINEAR)
        x0,y0=g['x0'],g['y0']; xa,ya=max(0,x0),max(0,y0); xb,yb=min(w,x0+bw),min(h,y0+bh)
        Uf=Uf[ya-y0:yb-y0,xa-x0:xb-x0]; Vf=Vf[ya-y0:yb-y0,xa-x0:xb-x0]
        pxcm=tw/(rapport_cm*p['scale'])           # пикселей рисунка на 1 см ткани
        c,s=math.cos(math.radians(p['rot'])),math.sin(math.radians(p['rot']))
        uu=(Uf+p['du'])*c-(Vf+p['dv'])*s; vv=(Uf+p['du'])*s+(Vf+p['dv'])*c
        mx=np.mod(uu*pxcm,tw).astype(np.float32); my=np.mod(vv*pxcm,th).astype(np.float32)
        # антиалиасинг при сильном уменьшении рисунка
        src=tile; dens=pxcm/ z['pxPerCm']
        if dens>1.6:
            k=dens/1.2; src=cv2.GaussianBlur(tile,(0,0),k*0.5)
        smp=cv2.remap(src,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
        m=(cv2.imread(f"{tdir}/{z['mask']}",0)[ya:yb,xa:xb]>127)
        shz=cv2.imread(f"{tdir}/{z['shade']}",0)[ya:yb,xa:xb].astype(np.float32)/255*1.5
        sub=pat[ya:yb,xa:xb]; sub[m]=smp[m]
        ssub=sh[ya:yb,xa:xb]; ssub[m]=shz[m]; hsub=hard[ya:yb,xa:xb]; hsub[m]=1
    # мягкое колено для пересветов
    sh=np.where(sh>1.0,1.0+(sh-1.0)*0.5,sh)
    rng=np.random.default_rng(1)
    grain=cv2.GaussianBlur(rng.normal(0,1,(h,w)).astype(np.float32),(0,0),0.8)
    grain=1+0.035*grain/grain.std()
    weft=1+0.012*np.sin(np.arange(h,dtype=np.float32)*2.1)[:,None]   # лёгкое переплетение
    fabric=np.clip(pat*(sh*grain*weft)[...,None]*tint,0,1)
    a=cv2.GaussianBlur(hard,(0,0),1.2)[...,None]
    res=base*(1-a)+fabric*a
    cv2.imwrite(out,(res*255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,90])
if __name__=='__main__':
    a=sys.argv; render(a[1],a[2],float(a[3]),a[4],float(a[5]) if len(a)>5 else 1.0,float(a[6]) if len(a)>6 else 0.0)
