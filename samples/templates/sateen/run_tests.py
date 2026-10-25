import sys; sys.path.insert(0,'.')
from render import render
import cv2,numpy as np
t='template'
render(t,'out/ss_white_1cm.jpg',stripes=[(1.25,'#f6f4f1',True),(1.25,'#f6f4f1',False)])
render(t,'out/ss_rose_validate.jpg',stripes=[(1.25,'#d9c6c4',True),(1.25,'#d9c6c4',False)])
render(t,'out/ss_graphite_2cm.jpg',stripes=[(2,'#5c6168',True),(2,'#5c6168',False)])
render(t,'out/ss_navy_05cm.jpg',stripes=[(0.5,'#22324f',True),(0.5,'#22324f',False)])
render(t,'out/ss_sage_wide.jpg',stripes=[(3,'#a9b8a0',True),(1,'#a9b8a0',False)])
render(t,'out/ss_print_floral.jpg',design='../kpb/designs/floral_lavanda.png',rapport_cm=40)
a=cv2.imread('src.png');b=cv2.imread('out/ss_rose_validate.jpg')
cv2.imwrite('v1.jpg',np.hstack([a[550:1100,250:1100],b[550:1100,250:1100]]))
