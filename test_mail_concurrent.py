import requests
import concurrent.futures
import json

data = {
    "recipients": ["akshay.doit@rajasthan.gov.in"],
    "subject_template": "Test",
    "body_template": "Test",
    "variables": {},
    "is_draft": False
}

def send_mail(i):
    return requests.post("http://localhost:8000/api/v2/mail/send", json=data).text

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(send_mail, range(3)))
    print(results)
