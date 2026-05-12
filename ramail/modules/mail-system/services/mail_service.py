import datetime
from typing import List, Optional, Dict
from interfaces.base_provider import BaseMailProvider

class MailService:
    """
    Business logic for enterprise mail processing, timeline events, and sending.
    """
    
    def __init__(self, provider: BaseMailProvider):
        self.provider = provider

    def _replace_placeholders(self, text: str, variables: Dict[str, str]) -> str:
        """Replaces dynamic variables in the text (e.g. {{FIR_NUMBER}})."""
        if not text:
            return text
        for key, value in variables.items():
            text = text.replace(f"{{{{{key}}}}}", str(value))
        return text

    def generate_subject(self, fir_number: str, ack_number: str, notice_type: str, department_name: str) -> str:
        """Generates the automated enterprise subject line."""
        current_time = datetime.datetime.now().strftime("%d-%b-%Y %I:%M %p")
        return f"[{fir_number}] {notice_type} | {ack_number} | {current_time} | {department_name}"

    def send_enterprise_mail(self, 
                             recipients: List[str], 
                             subject_template: str, 
                             body_template: str, 
                             variables: Dict[str, str], 
                             attachments: Optional[List[str]] = None) -> bool:
        """
        Processes templates and sends email via the configured provider.
        Emits events for Timeline tracking (mocked here).
        """
        # 1. Process Templates
        final_subject = self._replace_placeholders(subject_template, variables)
        final_body = self._replace_placeholders(body_template, variables)

        # 2. Connect and Send
        self.provider.connect()
        success = self.provider.send_email(
            recipients=recipients,
            subject=final_subject,
            body_html=final_body,
            attachments=attachments
        )

        # 3. Emit Timeline Event (To be hooked into the event bus)
        if success:
            self._emit_event("mail.sent", {
                "recipients": recipients,
                "subject": final_subject,
                "fir_number": variables.get("FIR_NUMBER"),
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "status": "Delivered"
            })
            
        return success

    def _emit_event(self, event_name: str, payload: dict):
        """Mock event emitter. Will be replaced by real Event Bus."""
        print(f"[EVENT] {event_name}: {payload}")
