from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from .send_mail import send_email
from .receive_mail import process_unread_emails
from .queue_worker import bulk_send_email_task
from .logger import app_logger

import sys
import os
# Add modules to path to support hyphenated module names
sys.path.append(os.path.join(os.getcwd(), 'modules', 'mail-system'))
from controllers.mail_controller import router as enterprise_mail_router

app = FastAPI(title="RajMail Automation API", version="1.0.0")

app.include_router(enterprise_mail_router)

class EmailRequest(BaseModel):
    recipients: List[EmailStr]
    subject: str
    body: str
    attachments: Optional[List[str]] = None
    use_queue: bool = True

@app.get("/")
async def root():
    return {"status": "online", "message": "RajMail Automation System is active"}

@app.post("/send")
async def trigger_send_email(req: EmailRequest):
    if req.use_queue:
        # Send via Celery
        bulk_send_email_task.delay(req.recipients, req.subject, req.body, req.attachments)
        return {"message": "Email task queued successfully", "recipients": req.recipients}
    else:
        # Send synchronously
        success = send_email(req.recipients, req.subject, req.body, req.attachments)
        if success:
            return {"message": "Email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")

@app.post("/poll")
async def trigger_poll_emails(background_tasks: BackgroundTasks):
    # Process in background of API (not necessarily Celery)
    background_tasks.add_task(process_unread_emails)
    return {"message": "Polling initiated in background"}

@app.get("/status")
async def system_status():
    # Basic status check
    return {
        "service": "RajMail",
        "database": "Redis (check Celery)",
        "logging": "Active"
    }
