import sys
from exchangelib import Credentials, Account, Configuration, DELEGATE, Message, Mailbox, HTMLBody
from exchangelib.errors import UnauthorizedError, AutoDiscoverFailed
import logging

# Set up logging for debugging (optional)
# logging.basicConfig(level=logging.INFO)

def login_to_exchange(email, password):
    """
    Authenticates with the Rajasthan Government Exchange server.
    """
    print(f"\n[*] Attempting to authenticate for: {email}")
    
    credentials = Credentials(email, password)
    
    # The server is likely mail.rajasthan.gov.in based on the OWA URL
    # We try to use Autodiscover first, as it's the most robust way.
    try:
        config = Configuration(server='mail.rajasthan.gov.in', credentials=credentials)
        account = Account(
            primary_smtp_address=email,
            config=config,
            autodiscover=False, # We try manually first if we know the server
            access_type=DELEGATE
        )
        print("[+] Login Successful!")
        return account
    except UnauthorizedError:
        print("[!] Error: Invalid credentials. Please check your email and password.")
    except Exception as e:
        print(f"[*] Trying Autodiscover due to: {e}")
        try:
            account = Account(
                primary_smtp_address=email,
                credentials=credentials,
                autodiscover=True,
                access_type=DELEGATE
            )
            print("[+] Login Successful (via Autodiscover)!")
            return account
        except AutoDiscoverFailed:
            print("[!] Error: Could not connect to the Exchange server. Ensure EWS is enabled.")
        except Exception as e:
            print(f"[!] Error: {e}")
    
    return None

def send_mail(account, recipient_email, subject, body_html):
    """
    Sends an email using the authenticated account.
    """
    print(f"[*] Sending email to {recipient_email}...")
    try:
        m = Message(
            account=account,
            folder=account.sent,
            subject=subject,
            body=HTMLBody(body_html),
            to_recipients=[Mailbox(email_address=recipient_email)]
        )
        m.send_and_save()
        print("[+] Email sent successfully!")
    except Exception as e:
        print(f"[!] Failed to send email: {e}")

def fetch_recent_emails(account, count=5):
    """
    Fetches the most recent emails from the Inbox.
    """
    print(f"\n[*] Fetching the last {count} emails...")
    try:
        # Sort by 'datetime_received' descending
        items = account.inbox.all().order_by('-datetime_received')[:count]
        
        if not items:
            print("[-] No emails found in Inbox.")
            return

        for item in items:
            print("-" * 50)
            print(f"From:    {item.sender.email_address}")
            print(f"Subject: {item.subject}")
            print(f"Date:    {item.datetime_received}")
            # print(f"Preview: {item.text_body[:100]}...") # Uncomment for preview
            
    except Exception as e:
        print(f"[!] Failed to fetch emails: {e}")

if __name__ == "__main__":
    print("="*40)
    print(" RAJASTHAN MAIL - PYTHON INTEGRATION ")
    print("="*40)
    
    import sys
    import os
    sys.path.append(os.path.join(os.getcwd(), 'modules', 'mail-system'))
    from config.mail_config import mail_settings

    # ---------------------------------------------------------
    # USER CONFIGURATION - LOADED FROM CENTRAL CONFIG
    # ---------------------------------------------------------
    MY_EMAIL = mail_settings.EMAIL_USER
    MY_PASSWORD = mail_settings.EMAIL_PASSWORD
    # ---------------------------------------------------------

    if "your_email" in MY_EMAIL:
        print("\n[!] PLEASE UPDATE 'MY_EMAIL' AND 'MY_PASSWORD' VARIABLES IN THE SCRIPT.")
        sys.exit(1)

    # Login
    user_account = login_to_exchange(MY_EMAIL, MY_PASSWORD)

    if user_account:
        # Example: Fetch recent emails
        fetch_recent_emails(user_account)
        
        # Example: Send a test email (Uncomment to use)
        # send_mail(
        #     user_account, 
        #     "recipient@example.com", 
        #     "Test from Python", 
        #     "<h1>Hello!</h1><p>This is a test email sent from my RajMail Python script.</p>"
        # )
    else:
        print("\n[!] Could not establish connection. Please check your network or credentials.")
