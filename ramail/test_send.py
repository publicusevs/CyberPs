import requests

def send_test_to_self():
    url = "http://localhost:8000/send"
    data = {
        "recipients": ["akshay.doit@rajasthan.gov.in"],
        "subject": "RajMail Automation: Self Test",
        "body": "<h1>नमस्ते!</h1><p>यह आपके द्वारा बनाए गए पायथन सिस्टम से भेजा गया एक सफल टेस्ट मेल है।</p>",
        "use_queue": False # Direct send for testing
    }
    
    try:
        print("[*] Sending email to yourself via API...")
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("[+] Success! Check your inbox.")
            print(f"Response: {response.json()}")
        else:
            print(f"[!] Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[!] API is not running or error occurred: {e}")

if __name__ == "__main__":
    send_test_to_self()
