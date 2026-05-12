import os
from .config import settings
from .logger import app_logger

def save_attachments(message):
    """
    Downloads and saves attachments from an exchangelib Message object.
    Returns a list of saved file paths.
    """
    saved_paths = []
    
    if not message.attachments:
        return saved_paths

    # Create a subfolder for this specific message (using subject/id for uniqueness)
    msg_folder_name = f"{message.datetime_received.strftime('%Y%m%d_%H%M%S')}_{message.subject[:30]}".replace(" ", "_")
    msg_folder_path = os.path.join(settings.DOWNLOAD_DIR, msg_folder_name)
    
    os.makedirs(msg_folder_path, exist_ok=True)

    for attachment in message.attachments:
        try:
            file_path = os.path.join(msg_folder_path, attachment.name)
            
            # Content is in bytes for FileAttachment
            with open(file_path, 'wb') as f:
                f.write(attachment.content)
            
            saved_paths.append(file_path)
            app_logger.info(f"Saved attachment: {attachment.name} to {file_path}")
            
        except Exception as e:
            app_logger.error(f"Failed to save attachment {attachment.name}: {e}")

    return saved_paths
