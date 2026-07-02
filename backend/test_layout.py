import fitz
import json
import re
import sys

def parse_pdf(file_path):
    doc = fitz.open(file_path)
    pages_blocks = []
    
    # 1. Block Extraction & Deduplication
    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("blocks")
        
        # A block is (x0, y0, x1, y1, text, block_no, block_type)
        # We only want text blocks (block_type == 0)
        text_blocks = []
        for b in blocks:
            if b[6] == 0:
                text = b[4].strip()
                if not text: continue
                # We need to detect identical text in near-identical positions
                # PyMuPDF often extracts duplicate text for bold/shadow fonts
                is_duplicate = False
                for tb in text_blocks:
                    if tb['text'] == text:
                        # check if bounding boxes overlap significantly
                        if abs(tb['x0'] - b[0]) < 2 and abs(tb['y0'] - b[1]) < 2:
                            is_duplicate = True
                            break
                if not is_duplicate:
                    text_blocks.append({
                        "x0": b[0], "y0": b[1], "x1": b[2], "y1": b[3],
                        "text": text, "block_no": b[5],
                        "page": page_num
                    })
        
        # Sort blocks by y0 (top to bottom), then x0 (left to right)
        text_blocks.sort(key=lambda b: (b['y0'], b['x0']))
        pages_blocks.append(text_blocks)
        
    return pages_blocks

def print_blocks(pages_blocks):
    for i, blocks in enumerate(pages_blocks):
        print(f"--- PAGE {i+1} ---")
        for b in blocks:
            print(f"Y:{b['y0']:.1f} X:{b['x0']:.1f} | {repr(b['text'])}")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    blocks = parse_pdf(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
    print_blocks(blocks[:1]) # just page 1 for now
