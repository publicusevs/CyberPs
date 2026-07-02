import fitz
import json

doc = fitz.open(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
page = doc[0]
blocks = page.get_text("blocks")
with open("backend/blocks_sample.json", "w", encoding="utf-8") as f:
    json.dump(blocks[:15], f, indent=2, ensure_ascii=False)
