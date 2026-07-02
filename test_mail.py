import requests
import json

data = {
    "recipients": ["akshay.doit@rajasthan.gov.in"],
    "subject_template": "Test",
    "body_template": "Test",
    "variables": {},
    "is_draft": False
}

print(requests.post("http://localhost:8000/api/v2/mail/send", json=data).text)
