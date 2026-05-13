from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class MailSettings(BaseSettings):
    """
    Common Configuration File for all Mail related settings.
    This acts as the single source of truth for email credentials and server details.
    """
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.getcwd(), ".env"), 
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
