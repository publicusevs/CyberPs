from typing import List, Optional, Any
from exchangelib import Credentials, Account, Configuration, DELEGATE, Message, Mailbox, HTMLBody, FileAttachment
from exchangelib.errors import UnauthorizedError, AutoDiscoverFailed
import os

from interfaces.base_provider import BaseMailProvider

class EwsProvider(BaseMailProvider):
    def __init__(self, email: str, password: str, server: str = 'mail.rajasthan.gov.in'):
        self.email = email
        self.password = password
        self.server = server
        self.account = None

    def connect(self) -> bool:
        try:
            credentials = Credentials(self.email, self.password)
            config = Configuration(server=self.server, credentials=credentials)
            self.account = Account(
                primary_smtp_address=self.email,
                config=config,
                autodiscover=False,
                access_type=DELEGATE
            )
            return True
        except Exception as e:
            # Fallback to autodiscover
            try:
                self.account = Account(
                    primary_smtp_address=self.email,
                    credentials=Credentials(self.email, self.password),
                    autodiscover=True,
                    access_type=DELEGATE
                )
                return True
            except Exception as inner_e:
                return False

    def fetch_emails(self, folder: str = "inbox", limit: int = 50) -> List[Any]:
        if not self.account:
            raise ConnectionError("Not connected to EWS account")
            
        target_folder = self.account.inbox
        if folder.lower() != "inbox":
            # Advanced folder resolution logic can be added here
            pass
            
        # Return unprocessed items
        return list(target_folder.filter(is_read=False).order_by('-datetime_received')[:limit])

    def send_email(self, recipients: List[str], subject: str, body_html: str, attachments: Optional[List[str]] = None) -> bool:
        if not self.account:
            raise ConnectionError("Not connected to EWS account")
            
        try:
            to_mailboxes = [Mailbox(email_address=email) for email in recipients]
            
            message = Message(
                account=self.account,
                folder=self.account.sent,
                subject=subject,
                body=HTMLBody(body_html),
                to_recipients=to_mailboxes
            )

            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        file_name = os.path.basename(file_path)
                        attachment = FileAttachment(name=file_name, content=content)
                        message.attach(attachment)

            message.send_and_save()
            return True
        except Exception as e:
            print(f"Error sending email via EWS: {e}")
            return False

    def download_attachment(self, message_id: str, attachment_id: str, save_dir: str) -> str:
        # To be implemented for safe incremental download
        pass
