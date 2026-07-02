import fitz
import re
from src.scripts.fir_extractor import merge_blocks

def inspect():
    doc = fitz.open('D:/Cyber/Cyber FIRs/FIR_IIFI_27998001240163.pdf')
    for i in range(len(doc)):
        pdict = doc[i].get_text("dict")
        blocks = merge_blocks(pdict)
        for b in blocks:
            if re.search(r'91-', b['text'], re.IGNORECASE) or re.search(r'8350', b['text'], re.IGNORECASE):
                print(f"Block: {b['text']} | Box: {b['x0']},{b['y0']} -> {b['x1']},{b['y1']}")
                
if __name__ == '__main__':
    inspect()
