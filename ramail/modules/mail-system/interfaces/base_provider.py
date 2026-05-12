from abc import ABC, abstractmethod
from typing import List, Optional, Any

class BaseMailProvider(ABC):
    """
    Abstract base class for all Mail Providers (EWS, IMAP, SMTP, etc.)
    """

    @abstractmethod
    def connect(self) -> bool:
        """Establishes connection to the mail server."""
        pass

    @abstractmethod
    def fetch_emails(self, folder: str = "inbox", limit: int = 50) -> List[Any]:
        """Fetches emails from the specified folder."""
        pass

    @abstractmethod
    def send_email(self, recipients: List[str], subject: str, body_html: str, attachments: Optional[List[str]] = None) -> bool:
        """Sends an email via the provider."""
        pass

    @abstractmethod
    def download_attachment(self, message_id: str, attachment_id: str, save_dir: str) -> str:
        """Downloads a specific attachment."""
        pass
