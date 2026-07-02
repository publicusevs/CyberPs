import requests

url = "http://127.0.0.1:5174/api/cases/parse-pdf"
file_path = r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf"

try:
    with open(file_path, "rb") as f:
        files = {"fir_file": (file_path, f, "application/pdf")}
        response = requests.post(url, files=files)
        print("Status Code:", response.status_code)
        try:
            print(response.json())
        except Exception as e:
            print(response.text)
except Exception as e:
    print("Error:", e)
