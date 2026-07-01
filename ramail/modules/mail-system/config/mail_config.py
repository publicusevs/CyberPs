from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

import sys

is_frozen = getattr(sys, 'frozen', False)
if is_frozen:
    _ENV_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(sys.executable), "..", ".env"))
else:
    _ENV_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env")

class MailSettings(BaseSettings):
    """
    Common Configuration File for all Mail related settings.
    This acts as the single source of truth for email credentials and server details.
    """
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE_PATH, 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

    # Core Mail Credentials
    EMAIL_USER: str
    EMAIL_PASSWORD: str
    
    # Server Configuration
    EXCHANGE_HOST: str = "mail.rajasthan.gov.in"
    EXCHANGE_PORT: int = 443

    # For testing direct scripts (Loaded from .env)
    SENDTO_EMAIL: str

mail_settings = MailSettings()

def reload_mail_settings():
    global mail_settings
    from dotenv import load_dotenv
    load_dotenv(_ENV_FILE_PATH, override=True)
    mail_settings = MailSettings()
