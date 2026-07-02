import subprocess
import json
import sys

try:
    result = subprocess.run(
        ["python", r"backend\src\scripts\fir_extractor.py", r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf"],
        capture_output=True,
        text=True,
        check=True
    )
    parsed = json.loads(result.stdout)
    data = parsed.get("data", {})
    for key, value in data.items():
        if isinstance(value, dict):
            print(f"{key}: {list(value.keys())}")
        else:
            print(f"{key}: {type(value)}")
except Exception as e:
    print("Error:", e)
