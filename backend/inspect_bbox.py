import fitz
import json

doc = fitz.open(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
pdict = doc[0].get_text("dict")

blocks = []
for b in pdict['blocks']:
    if b.get('type') == 0:
        for l in b['lines']:
            for s in l['spans']:
                text = s['text'].strip()
                if not text: continue
                x0, y0, x1, y1 = s['bbox']
                blocks.append({
                    "text": text,
                    "x0": round(x0, 2), "y0": round(y0, 2), "x1": round(x1, 2), "y1": round(y1, 2)
                })

import re
matches = []
for b in blocks:
    if "FIR No" in b['text'] or "Date and Time" in b['text'] or "Year" in b['text'] or "District" in b['text'] or "Entry No" in b['text'] or "P.S." in b['text']:
        matches.append(b)
    if re.search(r"^\d{4}$", b['text']) or "163" in b['text']: # 163 is the FIR no
        matches.append(b)

with open(r"D:\Projects\Vij\CyberPs\backend\inspect_bbox.json", "w", encoding="utf-8") as f:
    json.dump(matches, f, ensure_ascii=False, indent=2)
