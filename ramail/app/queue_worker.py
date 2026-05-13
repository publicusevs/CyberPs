from celery import Celery
from .config import settings
from .send_mail import send_email
from .receive_mail import process_unread_emails
from .logger import app_logger

# Initialize Celery
celery_app = Celery(
    'email_worker',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Configuration for Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
)

@celery_app.task(name="tasks.bulk_send_email", bind=True, max_retries=settings.MAX_RETRIES)
def bulk_send_email_task(self, recipients, subject, body, attachments=None):
    """
    Background task to send emails with retry mechanism.
    """
    app_logger.info(f"Queued bulk send to {recipients}")
    success = send_email(recipients, subject, body, attachments)
    
    if not success:
        # Retry logic
        try:
            self.retry(countdown=60 * 5) # Retry in 5 minutes
        except self.max_retries_exceeded_error:
            app_logger.error(f"Max retries exceeded for email to {recipients}")

@celery_app.task(name="tasks.auto_poll_emails")
def auto_poll_emails_task():
    """
    Background task to poll for new unread emails.
    """
    app_logger.info("Automatic polling started...")
    count = process_unread_emails()
    return f"Processed {count} emails"
