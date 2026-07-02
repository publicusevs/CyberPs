import os
import subprocess
import json

folder = r"D:\Cyber\Cyber FIRs"
script = r"D:\Projects\Vij\CyberPs\backend\src\scripts\fir_extractor.py"

success_count = 0
failed_files = []

for file in os.listdir(folder):
    if file.endswith(".pdf"):
        path = os.path.join(folder, file)
        try:
            result = subprocess.run(["python", script, path], capture_output=True, text=True, check=True)
            data = json.loads(result.stdout)
            if data.get("success"):
                success_count += 1
            else:
                failed_files.append((file, data.get("error")))
        except Exception as e:
            failed_files.append((file, str(e)))

print(f"Total Success: {success_count}")
if failed_files:
    print("Failures:")
    for f, err in failed_files:
        print(f"{f}: {err}")
else:
    print("All tested successfully.")
