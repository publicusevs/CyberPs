import fitz
import json
import re
import sys
import traceback

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

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

def find_nearest_right(blocks, label_block, ignore_regex=None, match_regex=None):
    best_block = None
    min_dist = 9999
    
    for b in blocks:
        if b['text'] == label_block['text']: continue
        if ignore_regex and re.search(ignore_regex, b['text'], re.IGNORECASE):
            continue
        if match_regex and not re.search(match_regex, b['text'], re.IGNORECASE):
            continue
        
        y_overlap = max(0, min(b['y1'], label_block['y1']) - max(b['y0'], label_block['y0']))
        # Use 40px tolerance for y-axis because form values are sometimes rendered slightly above/below labels
        is_close_y = abs(b['y0'] - label_block['y0']) < 40 or abs(b['y1'] - label_block['y1']) < 40
        
        if y_overlap > 0 or is_close_y:
            # The block should start strictly to the right of the label's left edge
            if b['x0'] > label_block['x0'] + 10:
                dist = b['x0'] - label_block['x1']
                # Allow a small negative overlap (-20) but no huge negative distances like -150
                if dist > -20:
                    # We want the closest block, so minimize absolute distance
                    if abs(dist) < abs(min_dist):
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
    try:
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
            val = find_nearest_right(pages_blocks[0], ps_lbl)
            if val: data['fir']['police_station_hi'] = val['text']
            
        # 3. Year
        idx, year_lbl = find_block_by_text(pages_blocks[0], r"Year\(वर्ष\)")
        if year_lbl:
            val = find_nearest_right(pages_blocks[0], year_lbl)
            if val: data['fir']['year'] = val['text']
            
        # 4. FIR No
        # First search for the Hindi label which is adjacent to the value
        idx, firno_lbl = find_block_by_text(pages_blocks[0], r"प्र\.सू\.रि\.सं")
        if not firno_lbl:
            # Fallback to English label
            idx, firno_lbl = find_block_by_text(pages_blocks[0], r"FIR No")
            
        if firno_lbl:
            # Check if the number is inline in the same block (e.g. "(प्र.सू.रि.सं): 0053")
            m = re.search(r'(?i)(?:FIR No\.?|प्र\.सू\.रि\.सं\)?)\s*[:-]?\s*(\d+)', firno_lbl['text'])
            if m:
                data['fir']['fir_no'] = m.group(1)
            else:
                # The FIR number is usually the very next numeric block.
                # Check the next 10 blocks for something that looks like an FIR number (e.g. "0053" or "53/2023").
                for b in pages_blocks[0][idx+1:idx+15]:
                    text = b['text'].strip()
                    if re.match(r'^\d{1,6}(?:/\d{2,4})?$', text):
                        data['fir']['fir_no'] = text
                        break
                
                # Fallback if regex didn't find anything
                if not data['fir'].get('fir_no'):
                    val = find_nearest_right(pages_blocks[0], firno_lbl, ignore_regex=r'Date and Time|एफआईआर|Time')
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
                # Ensure it actually looks like a date (contains digits)
                if val and re.search(r'\d', val['text']): 
                    data['occurrence']['date_to'] = val['text']
                    
            # If Date To is still empty or doesn't contain a date (e.g. grabbed a label), make it the same as Date From
            date_to_val = data['occurrence'].get('date_to', '')
            if not date_to_val or not re.search(r'\d', date_to_val):
                if data['occurrence'].get('date_from'):
                    data['occurrence']['date_to'] = data['occurrence']['date_from']
                
            _, tm_from = find_block_by_text(all_blocks[idx:], r"Time From")
            if tm_from:
                val = find_nearest_right(all_blocks, tm_from)
                if val: data['occurrence']['time_from'] = val['text'].replace("बजे", "").strip()
                
            _, tm_to = find_block_by_text(all_blocks[idx:], r"Time To")
            if tm_to:
                val = find_nearest_right(all_blocks, tm_to)
                if val: data['occurrence']['time_to'] = val['text'].replace("बजे", "").strip()
    
        # 9. Place of Occurrence
        idx, pl_lbl = find_block_by_text(all_blocks, r"Place of Occurrence")
        if pl_lbl:
            _, dir_lbl = find_block_by_text(all_blocks[idx:], r"Direction and distance")
            if dir_lbl:
                val = find_nearest_right(all_blocks, dir_lbl)
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
                # Check if name is in the same block
                text_clean = re.sub(r'(?i)^\s*\(?[a-z]?\)?\s*Name\s*\(नाम\)\s*:?', '', name_lbl['text']).strip()
                if text_clean:
                    data['complainant']['name'] = text_clean
                else:
                    val = find_nearest_right(all_blocks, name_lbl)
                    if val: data['complainant']['name'] = val['text']
                
            _, mob_lbl = find_block_by_text(all_blocks[idx:], r"Mobile\s*\(मोबाइल")
            if mob_lbl:
                # Require the value to have at least one digit
                val = find_nearest_right(all_blocks, mob_lbl, match_regex=r'\d')
                if val: data['complainant']['mobile'] = val['text']
                
            _, uid_lbl = find_block_by_text(all_blocks[idx:], r"UID")
            if uid_lbl:
                val = find_nearest_right(all_blocks, uid_lbl)
                if val: data['complainant']['uid'] = val['text']
                
            # Address extraction
            # 1. Search for table-based address "वर्तमान पता" (Present Address)
            curr_addr_idx, curr_addr_block = find_block_by_text(all_blocks[idx:], r"वर्तमान पता")
            if curr_addr_block and curr_addr_idx < 50: # Ensure it's nearby
                # Gather all blocks to the right of "वर्तमान पता"
                addr_parts = []
                target_x = curr_addr_block['x1'] + 10
                max_y = curr_addr_block['y1'] + 200
                
                for b in all_blocks[idx + curr_addr_idx + 1:]:
                    if b['y0'] > max_y or b['text'] in ['2', 'स्थायी पता', 'Address Type', 'Address(पता):']: 
                        break
                    if b['x0'] > target_x:
                        addr_parts.append(b['text'])
                
                if addr_parts:
                    data['complainant']['address'] = " ".join(addr_parts)
                else:
                    val_right = find_nearest_right(all_blocks, curr_addr_block)
                    if val_right:
                        data['complainant']['address'] = val_right['text']
            else:
                # 2. Fallback to direct label if "वर्तमान पता" not found
                c_addr_idx, c_addr_lbl = find_block_by_text(all_blocks[idx:], r"Address\s*\(पता\)")
                if c_addr_lbl and c_addr_idx < 30:
                    val = find_nearest_right(all_blocks, c_addr_lbl)
                    if val:
                        data['complainant']['address'] = val['text']
                
        # 11. Investigating Officer
        io_idx, io_lbl = find_block_by_text(all_blocks, r"took up the investigation|जाँच के लिए लिया गया")
        if io_lbl:
            for b in all_blocks[io_idx + 1: io_idx + 5]:
                text = b['text'].strip()
                # Skip fragments of the heading that got split into separate blocks
                if not text or "या गया):" in text or text in ["):", ":", "or (या)"]:
                    continue
                
                # Clean up trailing slashes or "or (या)"
                name_clean = re.sub(r'or\s*\(या\)|/|or\s*\(', '', text).strip()
                if name_clean:
                    data['officer'] = name_clean
                    break

        else:
            # Fallback to the last "Name(नाम)" occurrence which is usually the IO in some layouts
            io_matches = [b for b in all_blocks if re.search(r"Name\s*\(नाम\)", b['text'])]
            if len(io_matches) > 1:
                val = find_nearest_right(all_blocks, io_matches[-1]) 
                if val: data['officer'] = val['text']
                
        # 12. Acts and Sections
        data['acts_sections'] = get_acts_table(all_blocks)
        
        # 13. Narrative
        data['brief_facts'] = extract_narrative(pages_blocks)
        
        print(json.dumps({"success": True, "data": data}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "trace": traceback.format_exc()}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided"}))
        sys.exit(1)
        
    parse_fir(sys.argv[1])
