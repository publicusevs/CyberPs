from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # AI & LLM Settings
    OPENAI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o"
    
    # OCR Settings
    # On Windows, path to tesseract.exe (e.g., C:\Program Files\Tesseract-OCR\tesseract.exe)
    TESSERACT_PATH: Optional[str] = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    # On Windows, path to poppler/bin (e.g., C:\poppler\bin)
    POPPLER_PATH: Optional[str] = r"C:\poppler-24.07.0\Library\bin"
    
    # Infrastructure
    REDIS_URL: str = "redis://localhost:6379/0"
    DB_URL: str = "sqlite:///./database/rajmail_ai.db"
    MAX_RETRIES: int = 3
    FETCH_COUNT: int = 20
    
    # App Paths
    BASE_DIR: str = os.getcwd()
    ATTACH_DIR: str = os.path.join(BASE_DIR, "attachments")
    SENSITIVE_DIR: str = os.path.join(ATTACH_DIR, "sensitive")
    NORMAL_DIR: str = os.path.join(ATTACH_DIR, "normal")
    SUMMARY_DIR: str = os.path.join(BASE_DIR, "summaries")
    LOG_DIR: str = os.path.join(BASE_DIR, "logs")
    DB_DIR: str = os.path.join(BASE_DIR, "database")

    def create_dirs(self):
        for d in [self.ATTACH_DIR, self.SENSITIVE_DIR, self.NORMAL_DIR, 
                  self.SUMMARY_DIR, self.LOG_DIR, self.DB_DIR]:
            os.makedirs(d, exist_ok=True)

settings = Settings()
settings.create_dirs()
