"""Genera un subconjunto de Material Symbols Outlined con solo los iconos indicados.

Uso: python3 scripts/subset-font.py <fuente.woff2> <iconos.json> <salida.woff2>
Requiere `pip install fonttools brotli`. Lo invoca `npm run fonts:icons`.

pyftsubset conserva todas las ligaduras cuyas letras están en el subconjunto (casi todas), así que
se eliminan antes de la GSUB las que no interesan y después se recorta la fuente.
"""
import json
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

src, names_path, out = sys.argv[1:4]
wanted = set(json.load(open(names_path)))

font = TTFont(src)
order = set(font.getGlyphOrder())
missing = sorted(n for n in wanted if n not in order)
if missing:
    sys.exit(f"Iconos que no existen en la fuente: {', '.join(missing)}")

gsub = font["GSUB"].table
for lookup in gsub.LookupList.Lookup:
    for st in lookup.SubTable:
        if st.__class__.__name__ == "ExtensionSubst":
            st = st.ExtSubTable
        if st.__class__.__name__ == "LigatureSubst":
            for first, ligs in list(st.ligatures.items()):
                st.ligatures[first] = [l for l in ligs if l.LigGlyph in wanted]

options = subset.Options()
options.layout_features = ["rlig", "rclt", "liga", "calt"]
options.flavor = "woff2"
options.notdef_outline = True
options.name_IDs = [1, 2]
options.drop_tables += ["DSIG"]
subsetter = subset.Subsetter(options)
subsetter.populate(glyphs=sorted(wanted), text="abcdefghijklmnopqrstuvwxyz0123456789_")
subsetter.subset(font)
subset.save_font(font, out, options)
print(f"{len(wanted)} iconos -> {out}")
