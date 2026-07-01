from .config import settings
import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(parent_dir, 'modules', 'mail-system'))
from config import mail_config
from .logger import app_logger

from providers.factory import ProviderFactory

def get_mail_provider():
    """
    Establish a connection to the mail server using the appropriate provider.
    """
    mail_config.reload_mail_settings()
    
    app_logger.info(f"Authenticating with {mail_config.mail_settings.EMAIL_USER}...")
    
    provider = ProviderFactory.get_provider(
        email_address=mail_config.mail_settings.EMAIL_USER,
        password=mail_config.mail_settings.EMAIL_PASSWORD,
        exchange_host=mail_config.mail_settings.EXCHANGE_HOST
    )
    
    if provider.connect():
        app_logger.success(f"Successfully connected via {provider.__class__.__name__}")
        return provider
    else:
        app_logger.error("Authentication failed.")
        raise Exception("Failed to connect to the mail server")
