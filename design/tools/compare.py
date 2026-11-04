import sys
from PIL import Image, ImageChops
import numpy as np
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
d=np.abs(np.asarray(a).astype(int)-np.asarray(b).astype(int)).max(axis=2)
mask=d>40
print('differing px: %.2f%%'%(mask.mean()*100))
out=np.asarray(a).copy(); out[mask]=[255,0,255]
Image.fromarray(out.astype('uint8')).save(sys.argv[3])
