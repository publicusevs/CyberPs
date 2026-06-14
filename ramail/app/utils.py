from exchangelib import Credentials, Account, Configuration, DELEGATE
from exchangelib.errors import UnauthorizedError, AutoDiscoverFailed
from .config import settings
import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(parent_dir, 'modules', 'mail-system'))
from config.mail_config import mail_settings
from .logger import app_logger

def get_exchange_account():
    """
    Establish a connection to the Exchange server and return the account object.
    """
    app_logger.info(f"Authenticating with {mail_settings.EMAIL_USER}...")
    
    credentials = Credentials(mail_settings.EMAIL_USER, mail_settings.EMAIL_PASSWORD)
    
    try:
        # We attempt direct configuration first using the provided host
        config = Configuration(server=mail_settings.EXCHANGE_HOST, credentials=credentials)
        account = Account(
            primary_smtp_address=mail_settings.EMAIL_USER,
            config=config,
            autodiscover=False,
            access_type=DELEGATE
        )
        app_logger.success("Successfully connected to Exchange Server (Direct)")
        return account
    
    except UnauthorizedError:
        app_logger.error("Authentication failed: Invalid credentials.")
        raise
    
    except Exception as e:
        app_logger.warning(f"Direct connection failed: {e}. Attempting Autodiscover...")
        try:
            account = Account(
                primary_smtp_address=mail_settings.EMAIL_USER,
                credentials=credentials,
                autodiscover=True,
                access_type=DELEGATE
            )
            app_logger.success("Successfully connected to Exchange Server (Autodiscover)")
            return account
        except AutoDiscoverFailed:
            app_logger.critical("Autodiscover failed. Ensure EWS is enabled for your account.")
            raise
        except Exception as ex:
            app_logger.critical(f"Critical connection error: {ex}")
            raise
