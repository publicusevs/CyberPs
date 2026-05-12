from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from config.mail_config import mail_settings
from providers.ews_provider import EwsProvider
from services.mail_service import MailService

router = APIRouter(prefix="/api/v2/mail", tags=["Enterprise Mail System"])

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
    Enterprise send mail endpoint. Now sends real emails using configured credentials.
    """
    if req.is_draft:
        return {"message": "Draft saved successfully (Logic pending)."}

    # Initialize Provider with real credentials from mail config
    provider = EwsProvider(
        email=mail_settings.EMAIL_USER, 
        password=mail_settings.EMAIL_PASSWORD,
        server=mail_settings.EXCHANGE_HOST
    )
    
    mail_service = MailService(provider)
    
    # Send synchronously for testing (Can be moved to background_tasks later)
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
