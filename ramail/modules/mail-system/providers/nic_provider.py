import smtplib
import imaplib
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import parsedate_to_datetime
import os
import threading
import time
import traceback
from typing import List, Optional, Any
from datetime import datetime

from interfaces.base_provider import BaseMailProvider
from .models import MockMessage, MockAttachment

class SmtpImapProvider(BaseMailProvider):
    def __init__(self, email_address: str, password: str, smtp_server: str = "smtp.mgovcloud.in", smtp_port: int = 465, imap_server: str = "imap.mgovcloud.in", imap_port: int = 993):
        self.email_address = email_address
        self.password = password
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.imap_server = imap_server
        self.imap_port = imap_port
        self.smtp_conn = None
        self.imap_conn = None
        self._smtp_lock = threading.Lock()

    def connect(self) -> bool:
        """Connect SMTP only (IMAP is optional — only connects when fetch_emails is called)."""
        try:
            self._connect_smtp()
            return True
        except Exception as e:
            print(f"SMTP Connection failed: {e}")
            return False

    def _connect_smtp(self):
        # Clean up old connection if it exists to avoid TCP socket leaks
        if self.smtp_conn is not None:
            try:
                self.smtp_conn.quit()
            except Exception:
                try:
                    self.smtp_conn.close()
                except Exception:
                    pass
            self.smtp_conn = None

        if self.smtp_port == 465:
            self.smtp_conn = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=1800)
        else:
            self.smtp_conn = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=1800)
            self.smtp_conn.starttls()
        self.smtp_conn.login(self.email_address, self.password)

    def _connect_imap(self):
        """IMAP is optional — only called by fetch_emails, not by send."""
        self.imap_conn = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
        self.imap_conn.login(self.email_address, self.password)

    def _ensure_smtp(self):
        """Ensure a live SMTP connection, reconnecting only if needed."""
        if self.smtp_conn is None:
            self._connect_smtp()
            return
        # Ping the server with NOOP to detect stale connections cheaply
        try:
            self.smtp_conn.noop()
        except Exception:
            self._connect_smtp()

    def fetch_emails(self, folder: str = "inbox", limit: int = 50) -> List[Any]:
        if not self.imap_conn:
            self._connect_imap()
        
        self.imap_conn.select(folder)
        status, messages = self.imap_conn.search(None, 'UNSEEN')
        if status != 'OK':
            return []
            
        mail_ids = messages[0].split()
        mail_ids = mail_ids[-limit:] # Get the latest N emails
        
        results = []
        for mid in mail_ids:
            status, msg_data = self.imap_conn.fetch(mid, '(RFC822)')
            if status == 'OK':
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        subject = email.header.decode_header(msg['subject'])[0][0]
                        if isinstance(subject, bytes):
                            try:
                                subject = subject.decode()
                            except:
                                subject = str(subject)
                                
                        sender = email.utils.parseaddr(msg.get('from'))[1]
                        
                        date_str = msg.get('date')
                        dt_received = parsedate_to_datetime(date_str) if date_str else datetime.now()
                        if dt_received.tzinfo:
                            dt_received = dt_received.replace(tzinfo=None)
                            
                        attachments = []
                        for part in msg.walk():
                            if part.get_content_maintype() == 'multipart':
                                continue
                            if part.get('Content-Disposition') is None:
                                continue
                                
                            filename = part.get_filename()
                            if filename:
                                content = part.get_payload(decode=True)
                                attachments.append(MockAttachment(name=filename, content=content))
                                
                        # Capture mid for callback
                        current_mid = mid.decode('utf-8') if isinstance(mid, bytes) else mid
                        
                        mock_msg = MockMessage(
                            message_id=current_mid,
                            sender=sender,
                            subject=subject,
                            datetime_received=dt_received,
                            attachments=attachments,
                            provider_callback=self._mark_as_read
                        )
                        results.append(mock_msg)
        return results

    def _mark_as_read(self, message_id: str):
        if not self.imap_conn:
            self._connect_imap()
        self.imap_conn.select('inbox')
        self.imap_conn.store(message_id, '+FLAGS', '\\Seen')

    def send_email(self, recipients: List[str], subject: str, body_html: str, attachments: Optional[List[str]] = None) -> bool:
        with self._smtp_lock:
            # Use _ensure_smtp to get/reuse a live connection (NOOP-checked)
            try:
                self._ensure_smtp()
            except Exception as e:
                print(f"SMTP Connection failed: {e}")
                return False

            msg = MIMEMultipart()
            msg['From'] = self.email_address
            msg['To'] = ", ".join(recipients)
            msg['Subject'] = subject

            msg.attach(MIMEText(body_html, 'html'))

            if attachments:
                for filepath in attachments:
                    if os.path.exists(filepath):
                        with open(filepath, "rb") as f:
                            part = MIMEApplication(f.read(), Name=os.path.basename(filepath))
                            part['Content-Disposition'] = f'attachment; filename="{os.path.basename(filepath)}"'
                            msg.attach(part)
            try:
                self.smtp_conn.send_message(msg)
                return True
            except (smtplib.SMTPServerDisconnected, smtplib.SMTPException):
                # Connection dropped — reconnect once and retry immediately
                try:
                    time.sleep(1) # Prevent hammering NIC server
                    self._connect_smtp()
                    self.smtp_conn.send_message(msg)
                    return True
                except Exception as e:
                    print(f"SMTP reconnect + send failed: {e}")
                    traceback.print_exc()
                    return False
            except Exception as e:
                print(f"SMTP Send failed: {e}")
                traceback.print_exc()
                return False

    def download_attachment(self, message_id: str, attachment_id: str, save_dir: str) -> str:
        pass
