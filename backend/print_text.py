import subprocess
import json

try:
    result = subprocess.run(
        ["python", r"backend\src\scripts\fir_extractor.py", r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf"],
        capture_output=True,
        text=True,
        check=True,
        encoding="utf-8"
    )
    parsed = json.loads(result.stdout)
    with open("backend/raw_text.txt", "w", encoding="utf-8") as f:
        f.write(parsed.get("data", {}).get("raw_text", ""))
except Exception as e:
    print("Error:", e)
