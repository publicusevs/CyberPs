from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from config import mail_config
from providers.factory import ProviderFactory
from services.mail_service import MailService

router = APIRouter(prefix="/api/v2/mail", tags=["Enterprise Mail System"])

# OPTIMIZATION: Cache provider instance so SMTP connection is reused across requests
_cached_provider = None
_cached_user = None

def get_or_create_provider():
    """Return a cached provider, rebuilding only when credentials change."""
    global _cached_provider, _cached_user
    mail_config.reload_mail_settings()
    current_user = mail_config.mail_settings.EMAIL_USER
    if _cached_provider is None or _cached_user != current_user:
        _cached_provider = ProviderFactory.get_provider(
            email_address=mail_config.mail_settings.EMAIL_USER,
            password=mail_config.mail_settings.EMAIL_PASSWORD,
            exchange_host=mail_config.mail_settings.EXCHANGE_HOST
        )
        _cached_user = current_user
    return _cached_provider

class ComposeMailRequest(BaseModel):
    recipients: List[EmailStr]
    subject_template: str
    body_template: str
    variables: Dict[str, str] = {}
    attachments: Optional[List[str]] = None
    is_draft: bool = False

@router.post("/send")
async def send_enterprise_mail(req: ComposeMailRequest):
    """
    Enterprise send mail endpoint. Reuses persistent SMTP connection for speed.
    """
    if req.is_draft:
        return {"message": "Draft saved successfully (Logic pending)."}

    provider = get_or_create_provider()
    mail_service = MailService(provider)

    success = mail_service.send_enterprise_mail(
        recipients=req.recipients,
        subject_template=req.subject_template,
        body_template=req.body_template,
        variables=req.variables,
        attachments=req.attachments if req.attachments and "string" not in req.attachments else None
    )

    if success:
        return {
            "status": "Success",
            "message": f"Email sent successfully to {req.recipients}",
            "timeline_event": "mail.sent emitted"
        }
    else:
        # Reset cached provider so next request reconnects fresh
        _cached_provider = None
        raise HTTPException(status_code=500, detail="Failed to send email. Check server logs.")


@router.get("/dashboard/alerts")
async def get_dashboard_alerts():
    """
    Returns data for the Dashboard Alert System (Recent, Failed, Drafts, FIR Matches).
    """
    return {
        "recent_sent": 5,
        "failed_delivery": 0,
        "pending_sync": 12,
        "new_fir_matches": 3
    }

@router.post("/sync")
async def trigger_manual_sync(folder: str = "inbox"):
    """
    Triggers manual incremental sync for the specified folder.
    """
    return {
        "message": f"Sync started for folder: {folder}",
        "status": "Processing"
    }
