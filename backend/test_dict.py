import fitz
import sys

def parse_pdf(file_path):
    doc = fitz.open(file_path)
    
    # Let's look at dict format for page 1
    page = doc[0]
    pdict = page.get_text("dict")
    
    blocks = []
    for b in pdict['blocks']:
        if b['type'] == 0: # text block
            for l in b['lines']:
                for s in l['spans']:
                    text = s['text'].strip()
                    if text:
                        blocks.append({
                            "x0": s['bbox'][0],
                            "y0": s['bbox'][1],
                            "x1": s['bbox'][2],
                            "y1": s['bbox'][3],
                            "text": text,
                            "size": s['size']
                        })
                        
    # Sort blocks by y0 then x0
    blocks.sort(key=lambda x: (round(x['y0']/5)*5, x['x0']))
    
    # Deduplicate exact text on same line
    unique_blocks = []
    for b in blocks:
        if not unique_blocks:
            unique_blocks.append(b)
        else:
            last = unique_blocks[-1]
            if last['text'] == b['text'] and abs(last['x0'] - b['x0']) < 10 and abs(last['y0'] - b['y0']) < 10:
                continue
            unique_blocks.append(b)
            
    for b in unique_blocks[:50]:
        print(f"Y:{b['y0']:7.1f} X:{b['x0']:7.1f} | {b['text']}")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    parse_pdf(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
