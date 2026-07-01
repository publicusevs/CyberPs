from typing import List
from datetime import datetime

class MockSender:
    def __init__(self, email_address: str):
        self.email_address = email_address

class MockAttachment:
    def __init__(self, name: str, content: bytes):
        self.name = name
        self.content = content

class MockMessage:
    def __init__(self, message_id: str, sender: str, subject: str, datetime_received: datetime, attachments: List[MockAttachment], provider_callback=None):
        self.message_id = message_id
        self.sender = MockSender(sender)
        self.subject = subject
        self.datetime_received = datetime_received
        self.attachments = attachments
        self.is_read = False
        self._provider_callback = provider_callback

    def save(self, update_fields: List[str] = None):
        """
        Mimics exchangelib's save(). Used to mark as read.
        """
        if update_fields and 'is_read' in update_fields and self.is_read and self._provider_callback:
            self._provider_callback(self.message_id)

