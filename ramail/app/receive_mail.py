from .utils import get_exchange_account
from .attachment_handler import save_attachments
from .logger import app_logger
from .config import settings

def process_unread_emails():
    """
    Fetches unread emails, processes them (downloads attachments), 
    and marks them as read.
    """
    try:
        account = get_exchange_account()
        
        # Query unread emails
        unread_messages = account.inbox.filter(is_read=False).order_by('-datetime_received')[:settings.FETCH_COUNT]
        
        count = 0
        for message in unread_messages:
            app_logger.info(f"Processing message: {message.subject} from {message.sender.email_address}")
            
            # Save attachments
            saved_files = save_attachments(message)
            
            # You can add custom processing logic here (e.g., database storage)
            
            # Mark as read
            message.is_read = True
            message.save(update_fields=['is_read'])
            
            count += 1
            app_logger.info(f"Message '{message.subject}' marked as read. Attachments: {len(saved_files)}")

        app_logger.success(f"Finished processing {count} unread emails.")
        return count

    except Exception as e:
        app_logger.error(f"Error during email retrieval: {e}")
        return 0
