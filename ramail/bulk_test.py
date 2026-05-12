from app.send_mail import send_email
from app.logger import app_logger
import time

def send_bulk_to_self():
    my_email = "vijendras.doit@rajasthan.gov.in"
    
    print(f"[*] Starting bulk send (5 emails) to {my_email}...")
    
    for i in range(1, 6):
        subject = f"Bulk Test Mail #{i}"
        body = f"""
        <h1>Bulk Test - Message {i}</h1>
        <p>यह आपके ऑटोमेशन सिस्टम का <b>ईमेल नंबर {i}</b> है।</p>
        <p>सिस्टम सफलतापूर्वक लूप में काम कर रहा है।</p>
        """
        
        print(f"[*] Sending mail {i}/5...")
        success = send_email([my_email], subject, body)
        
        if success:
            print(f"[+] Mail {i} sent successfully.")
        else:
            print(f"[!] Failed to send mail {i}.")
        
        # Adding a small delay to avoid server throttling
        if i < 5:
            time.sleep(2)

    print("\n[+] Bulk sending completed!")

if __name__ == "__main__":
    send_bulk_to_self()
