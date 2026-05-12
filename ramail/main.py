import uvicorn
import time
import sys
from app.api import app
from app.logger import app_logger
from app.utils import get_exchange_account
from app.attachment_downloader import process_and_download_attachments
from app.database import init_db, log_processed_email
from app.config import settings

def poll_and_process():
    """
    Main loop to poll for new emails and process them.
    """
    app_logger.info("Email Monitoring Service Started...")
    init_db()
    
    while True:
        try:
            account = get_exchange_account()
            # Fetch unread emails
            unread_messages = account.inbox.filter(is_read=False).order_by('datetime_received')[:settings.FETCH_COUNT]
            
            for msg in unread_messages:
                app_logger.info(f"New Email detected: {msg.subject}")
                
                # Process attachments
                paths, is_sensitive, summary = process_and_download_attachments(msg)
                
                # Log to database
                log_processed_email(
                    msg_id=msg.message_id,
                    sender=msg.sender.email_address,
                    subject=msg.subject,
                    received_at=msg.datetime_received.replace(tzinfo=None), # naive for sqlite
                    is_sensitive=is_sensitive,
                    summary=summary,
                    paths=paths
                )
                
                # Mark as read
                msg.is_read = True
                msg.save(update_fields=['is_read'])
                app_logger.success(f"Processed email: {msg.subject}")
                
        except Exception as e:
            app_logger.error(f"Polling error: {e}")
            
        time.sleep(30) # Poll every 30 seconds

if __name__ == "__main__":
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        if mode == "api":
            uvicorn.run(app, host="0.0.0.0", port=8000)
        elif mode == "monitor":
            poll_and_process()
    else:
        app_logger.info("Usage: python main.py [api|monitor]")
        # Default for local testing: Start both or just monitor
        poll_and_process()
