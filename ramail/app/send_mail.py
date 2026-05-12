from exchangelib import Message, Mailbox, HTMLBody, FileAttachment
from .utils import get_exchange_account
from .logger import app_logger
import os

def send_email(to_emails, subject, body_html, attachments=None):
    """
    Sends an email with optional attachments.
    :param to_emails: List of recipient email addresses
    :param subject: Email subject
    :param body_html: Email body in HTML format
    :param attachments: List of file paths to attach
    """
    try:
        account = get_exchange_account()
        
        # Prepare recipients
        recipients = [Mailbox(email_address=email) for email in to_emails]
        
        message = Message(
            account=account,
            folder=account.sent,
            subject=subject,
            body=HTMLBody(body_html),
            to_recipients=recipients
        )

        # Handle attachments
        if attachments:
            for file_path in attachments:
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    file_name = os.path.basename(file_path)
                    attachment = FileAttachment(name=file_name, content=content)
                    message.attach(attachment)
                    app_logger.debug(f"Attached file: {file_name}")
                else:
                    app_logger.warning(f"Attachment file not found: {file_path}")

        message.send_and_save()
        app_logger.success(f"Email sent successfully to {to_emails}")
        return True

    except Exception as e:
        app_logger.error(f"Failed to send email: {e}")
        return False
