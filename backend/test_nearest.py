import fitz
import json
import sys

doc = fitz.open(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
pdict = doc[0].get_text("dict")

def merge_blocks(pdict):
    blocks = []
    seen = set()
    for b in pdict['blocks']:
        if b.get('type') == 0:
            for l in b['lines']:
                for s in l['spans']:
                    text = s['text'].strip()
                    if not text: continue
                    x0, y0, x1, y1 = s['bbox']
                    grid_key = (text, round(x0/5), round(y0/5))
                    if grid_key not in seen:
                        seen.add(grid_key)
                        blocks.append({
                            "x0": x0, "y0": y0, "x1": x1, "y1": y1, "text": text
                        })
    blocks.sort(key=lambda x: (round(x['y0']/5)*5, x['x0']))
    return blocks

blocks = merge_blocks(pdict)

def find_nearest_right(blocks, label_block):
    best_block = None
    min_dist = 9999
    
    for b in blocks:
        # Avoid matching self or identical text
        if b['text'] == label_block['text']: continue
        
        # Check vertical overlap or closeness
        y_overlap = max(0, min(b['y1'], label_block['y1']) - max(b['y0'], label_block['y0']))
        is_close_y = abs(b['y0'] - label_block['y0']) < 60 or abs(b['y1'] - label_block['y1']) < 60
        
        if y_overlap > 0 or is_close_y:
            # Strictly to the right
            if b['x0'] > label_block['x0'] + 10:
                dist = b['x0'] - label_block['x1']
                if dist < min_dist and dist > -150:
                    min_dist = dist
                    best_block = b
    return best_block

import re
def find_block_by_text(blocks, text_regex, start_idx=0):
    for i in range(start_idx, len(blocks)):
        if re.search(text_regex, blocks[i]['text'], re.IGNORECASE):
            return i, blocks[i]
    return -1, None

results = {}

_, firno_lbl = find_block_by_text(blocks, r"FIR No")
if firno_lbl:
    results["FIR_NO"] = find_nearest_right(blocks, firno_lbl)

_, yr_lbl = find_block_by_text(blocks, r"Year\(वर्ष\)")
if yr_lbl:
    results["YEAR"] = find_nearest_right(blocks, yr_lbl)

_, dist_lbl = find_block_by_text(blocks, r"District\s*\(जिला\)")
if dist_lbl:
    results["DISTRICT"] = find_nearest_right(blocks, dist_lbl)

_, ps_lbl = find_block_by_text(blocks, r"P\.S\.\(थाना\)")
if ps_lbl:
    results["PS"] = find_nearest_right(blocks, ps_lbl)

_, fdt_lbl = find_block_by_text(blocks, r"Date and Time of FIR")
if fdt_lbl:
    results["DATE_TIME"] = find_nearest_right(blocks, fdt_lbl)

_, gd_lbl = find_block_by_text(blocks, r"Entry No")
if gd_lbl:
    results["GD_NO"] = find_nearest_right(blocks, gd_lbl)

with open(r"D:\Projects\Vij\CyberPs\backend\test_nearest.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
