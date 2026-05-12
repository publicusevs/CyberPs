from app.send_mail import send_email
from app.logger import app_logger
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'modules', 'mail-system'))
from config.mail_config import mail_settings

def send_to_self_direct():
    my_email = mail_settings.SENDTO_EMAIL
    subject = "Direct Test: RajMail Automation"
    body = """
    <h1>नमस्ते विहेंद्र जी!</h1>
    <p>यह मेल बिना API के सीधे पायथन स्क्रिप्ट से भेजा गया है।</p>
    <p>इसका मतलब है कि आपका <b>exchangelib</b> और <b>credentials</b> बिल्कुल सही काम कर रहे हैं।</p>
    """
    
    print(f"[*] Attempting to send direct email to {my_email}...")
    success = send_email([my_email], subject, body)
    
    if success:
        print("[+] SUCCESS! Please check your government email inbox.")
    else:
        print("[!] FAILED! Please check the logs in the 'logs' folder for details.")

if __name__ == "__main__":
    send_to_self_direct()
