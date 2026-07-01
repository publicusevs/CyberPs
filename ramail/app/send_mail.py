from .utils import get_mail_provider
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
        provider = get_mail_provider()
        success = provider.send_email(
            recipients=to_emails,
            subject=subject,
            body_html=body_html,
            attachments=attachments
        )
        
        if success:
            app_logger.success(f"Email sent successfully to {to_emails}")
        return success

    except Exception as e:
        app_logger.error(f"Failed to send email: {e}")
        return False
