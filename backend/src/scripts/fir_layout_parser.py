import fitz
import json
import re
import sys

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
                    # Use a grid of 5px to deduplicate shadow/bold layers
                    grid_key = (text, round(x0/5), round(y0/5))
                    
                    if grid_key not in seen:
                        seen.add(grid_key)
                        blocks.append({
                            "x0": x0,
                            "y0": y0,
                            "x1": x1,
                            "y1": y1,
                            "text": text,
                            "size": s['size']
                        })
    
    # Sort blocks by Y top-to-bottom, then X left-to-right
    blocks.sort(key=lambda x: (round(x['y0']/5)*5, x['x0']))
    return blocks

def find_block_by_text(blocks, text_regex, start_idx=0):
    for i in range(start_idx, len(blocks)):
        if re.search(text_regex, blocks[i]['text'], re.IGNORECASE):
            return i, blocks[i]
    return -1, None

def find_nearest_right(blocks, label_block):
    best_block = None
    min_dist = 9999
    
    for b in blocks:
        # Same approximate Y line
        if abs(b['y0'] - label_block['y0']) < 15 or abs(b['y1'] - label_block['y1']) < 15:
            # Strictly to the right
            if b['x0'] > label_block['x0']:
                dist = b['x0'] - label_block['x1']
                if dist < min_dist and dist > -15:
                    min_dist = dist
                    best_block = b
    return best_block

def find_nearest_bottom(blocks, label_block):
    best_block = None
    min_dist = 9999
    
    for b in blocks:
        # Approximate X column
        if abs(b['x0'] - label_block['x0']) < 50:
            # Strictly below
            if b['y0'] > label_block['y1'] - 5:
                dist = b['y0'] - label_block['y1']
                if dist < min_dist and dist > -10:
                    min_dist = dist
                    best_block = b
    return best_block

def get_acts_table(blocks):
    acts = []
    idx, header = find_block_by_text(blocks, r"S\.No\.")
    if idx == -1: return acts
    
    sno_x = header['x0']
    current_sno = 1
    for b in blocks[idx:]:
        if b['text'] == str(current_sno) and abs(b['x0'] - sno_x) < 80:
            row_y = b['y0']
            
            # Find act and section on this row
            act_blocks = []
            sec_blocks = []
            
            for x in blocks:
                if abs(x['y0'] - row_y) < 15:
                    if x['x0'] > sno_x + 30 and x['x0'] < sno_x + 1300: # Act usually near X:300-1000
                        act_blocks.append(x)
                    elif x['x0'] >= sno_x + 1300: # Section usually near X:1900+
                        sec_blocks.append(x)
            
            act_blocks.sort(key=lambda x: x['x0'])
            sec_blocks.sort(key=lambda x: x['x0'])
            
            act = " ".join([x['text'] for x in act_blocks]).strip()
            sec = " ".join([x['text'] for x in sec_blocks]).strip()
            
            if act or sec:
                # Filter out table header junk that might have slipped in
                if not re.search(r"Act|Section", act, re.IGNORECASE) and not re.search(r"Act|Section", sec, re.IGNORECASE):
                    acts.append({"act_hi": act, "section": sec})
                
            current_sno += 1
            
    return acts

def deduplicate_text(text_list):
    result = []
    for t in text_list:
        if len(t) < 5: 
            result.append(t)
            continue
            
        joined = " ".join(result)
        if t in joined or t.strip() in joined:
            continue
            
        result.append(t)
    return " ".join(result).strip()

def extract_narrative(pages_blocks):
    narrative_text = []
    recording = False
    
    for blocks in pages_blocks:
        for b in blocks:
            text = b['text']
            
            # Start recording when we see the contents header
            if re.search(r"First Information contents", text, re.IGNORECASE) or re.search(r"प्रथम सूचना तथ्य", text):
                recording = True
                continue
                
            if recording:
                # Stop conditions
                if (re.search(r"Signature\s*/\s*Thumb\s*impression", text, re.IGNORECASE) or 
                    re.search(r"हस्ताक्षर\s*/\s*अंगूठे का निशान", text) or
                    re.search(r"F\.I\.R\. read over to the complainant", text, re.IGNORECASE)):
                    recording = False
                    break
                    
                # Ignore page headers that appear in the middle of text across pages
                if re.search(r"I\.I\.F\.-I", text) or re.search(r"FIRST INFORMATION REPORT", text):
                    continue
                    
                narrative_text.append(text)
                
    return deduplicate_text(narrative_text)

def parse_fir(file_path):
    doc = fitz.open(file_path)
    pages_blocks = []
    
    for i in range(len(doc)):
        pdict = doc[i].get_text("dict")
        pages_blocks.append(merge_blocks(pdict))
        
    all_blocks = [b for page in pages_blocks for b in page]
    
    data = {
        "fir": {},
        "occurrence": {},
        "place_of_occurrence": {},
        "acts_sections": [],
        "complainant": {},
        "brief_facts": "",
        "officer": ""
    }
    
    # 1. District
    idx, dist_lbl = find_block_by_text(pages_blocks[0], r"District\s*\(जिला\)")
    if dist_lbl:
        val = find_nearest_right(pages_blocks[0], dist_lbl)
        if val: data['fir']['district_hi'] = val['text']
        
    # 2. P.S.
    idx, ps_lbl = find_block_by_text(pages_blocks[0], r"P\.S\.\(थाना\)")
    if ps_lbl:
        val = find_nearest_bottom(pages_blocks[0], ps_lbl)
        if val: data['fir']['police_station_hi'] = val['text']
        
    # 3. Year
    idx, year_lbl = find_block_by_text(pages_blocks[0], r"Year\(वर्ष\)")
    if year_lbl:
        val = find_nearest_bottom(pages_blocks[0], year_lbl)
        if val: data['fir']['year'] = val['text']
        
    # 4. FIR No
    idx, firno_lbl = find_block_by_text(pages_blocks[0], r"FIR No")
    if firno_lbl:
        val = find_nearest_right(pages_blocks[0], firno_lbl)
        if val: data['fir']['fir_no'] = val['text']
        
    # 5. Date and Time of FIR
    idx, fdt_lbl = find_block_by_text(pages_blocks[0], r"Date and Time of FIR")
    if fdt_lbl:
        val = find_nearest_right(pages_blocks[0], fdt_lbl)
        if val:
            parts = val['text'].split()
            if len(parts) >= 2:
                data['fir']['fir_date'] = parts[0]
                data['fir']['fir_time'] = parts[1]
                
    # 6. Information received
    idx, info_lbl = find_block_by_text(pages_blocks[0], r"Information received at P\.S\.")
    if info_lbl:
        idx2, dt_lbl = find_block_by_text(pages_blocks[0][idx:], r"Date\s*\(दिनांक\)")
        if dt_lbl:
            val = find_nearest_right(pages_blocks[0], dt_lbl)
            if val: data['occurrence']['information_received_date'] = val['text']
            
        idx2, tm_lbl = find_block_by_text(pages_blocks[0][idx:], r"Time\s*\(समय\)")
        if tm_lbl:
            val = find_nearest_right(pages_blocks[0], tm_lbl)
            if val: data['occurrence']['information_received_time'] = val['text']
            
    # 7. GD No
    idx, entry_lbl = find_block_by_text(all_blocks, r"Entry No\.\s*\(प्रविष्टि")
    if entry_lbl:
        val = find_nearest_bottom(all_blocks, entry_lbl)
        if not val:
            val = find_nearest_right(all_blocks, entry_lbl)
        if val: data['fir']['gd_entry_no'] = val['text']
            
    # 8. Occurrence Date/Time
    idx, occ_lbl = find_block_by_text(all_blocks, r"Occurrence of offence")
    if occ_lbl:
        _, dt_from = find_block_by_text(all_blocks[idx:], r"Date From")
        if dt_from:
            val = find_nearest_right(all_blocks, dt_from)
            if val: data['occurrence']['date_from'] = val['text']
        
        _, dt_to = find_block_by_text(all_blocks[idx:], r"Date To")
        if dt_to:
            val = find_nearest_right(all_blocks, dt_to)
            if val: data['occurrence']['date_to'] = val['text']
            
        _, tm_from = find_block_by_text(all_blocks[idx:], r"Time From")
        if tm_from:
            val = find_nearest_bottom(all_blocks, tm_from)
            if not val: val = find_nearest_right(all_blocks, tm_from)
            if val: data['occurrence']['time_from'] = val['text'].replace("बजे", "").strip()
            
        _, tm_to = find_block_by_text(all_blocks[idx:], r"Time To")
        if tm_to:
            val = find_nearest_bottom(all_blocks, tm_to)
            if not val: val = find_nearest_right(all_blocks, tm_to)
            if val: data['occurrence']['time_to'] = val['text'].replace("बजे", "").strip()

    # 9. Place of Occurrence
    idx, pl_lbl = find_block_by_text(all_blocks, r"Place of Occurrence")
    if pl_lbl:
        _, dir_lbl = find_block_by_text(all_blocks[idx:], r"Direction and distance")
        if dir_lbl:
            val = find_nearest_bottom(all_blocks, dir_lbl)
            if val: data['place_of_occurrence']['direction_from_ps'] = val['text']
            
        _, beat_lbl = find_block_by_text(all_blocks[idx:], r"Beat No\.")
        if beat_lbl:
            val = find_nearest_right(all_blocks, beat_lbl)
            if val: data['place_of_occurrence']['beat_no'] = val['text']
            
        _, addr_lbl = find_block_by_text(all_blocks[idx:], r"Address\s*\(पता\)")
        if addr_lbl:
            val = find_nearest_right(all_blocks, addr_lbl)
            if val: data['place_of_occurrence']['address'] = val['text']
            
    # 10. Complainant
    idx, comp_lbl = find_block_by_text(all_blocks, r"Complainant\s*/\s*Informant")
    if comp_lbl:
        _, name_lbl = find_block_by_text(all_blocks[idx:], r"Name\s*\(नाम\)")
        if name_lbl:
            val = find_nearest_right(all_blocks, name_lbl)
            if val: data['complainant']['name'] = val['text']
            
        _, mob_lbl = find_block_by_text(all_blocks[idx:], r"Mobile\s*\(मोबाइल")
        if mob_lbl:
            val = find_nearest_right(all_blocks, mob_lbl)
            if val: data['complainant']['mobile'] = val['text']
            
        _, uid_lbl = find_block_by_text(all_blocks[idx:], r"UID")
        if uid_lbl:
            val = find_nearest_right(all_blocks, uid_lbl)
            if val: data['complainant']['uid'] = val['text']
            
    # 11. Investigating Officer
    io_matches = [b for b in all_blocks if re.search(r"Name\s*\(नाम\)", b['text'])]
    if len(io_matches) > 1:
        val = find_nearest_right(all_blocks, io_matches[-1]) # last occurrence is usually IO
        if val: data['officer'] = val['text']
            
    # 12. Acts and Sections
    data['acts_sections'] = get_acts_table(all_blocks)
    
    # 13. Narrative
    data['brief_facts'] = extract_narrative(pages_blocks)
    
    return data

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    res = parse_fir(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
    print(json.dumps(res, indent=2, ensure_ascii=False))
