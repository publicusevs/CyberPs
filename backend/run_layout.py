import sys
sys.path.append(r"D:\Projects\Vij\CyberPs\backend\src\scripts")
import fir_layout_parser
import json

data = fir_layout_parser.parse_fir(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")

with open(r"D:\Projects\Vij\CyberPs\backend\layout_test_clean.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
