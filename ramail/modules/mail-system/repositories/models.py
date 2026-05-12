from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class MailAccount(Base):
    __tablename__ = 'mail_accounts'
    
    id = Column(Integer, primary_key=True)
    user_email = Column(String, unique=True, index=True)
    provider_type = Column(String) # EWS, IMAP, SMTP
    host = Column(String)
    port = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MailFolder(Base):
    __tablename__ = 'mail_folders'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True) # e.g., "Inbox", "FIR-2026-1458"
    description = Column(String, nullable=True)
    is_system_folder = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class MailMessage(Base):
    __tablename__ = 'mail_messages'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String, unique=True, index=True)
    uid = Column(String, nullable=True, index=True)
    account_id = Column(Integer, ForeignKey('mail_accounts.id'))
    folder_id = Column(Integer, ForeignKey('mail_folders.id'))
    
    sender = Column(String, index=True)
    recipients = Column(JSON) # List of email strings
    subject = Column(String, index=True)
    body_snippet = Column(String)
    body_html = Column(String, nullable=True)
    
    received_at = Column(DateTime, index=True)
    processed_at = Column(DateTime, default=datetime.utcnow)
    
    is_read = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    has_attachments = Column(Boolean, default=False)

    account = relationship("MailAccount")
    folder = relationship("MailFolder")

class MailAttachment(Base):
    __tablename__ = 'mail_attachments'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(Integer, ForeignKey('mail_messages.id'))
    filename = Column(String, index=True)
    file_type = Column(String)
    size_bytes = Column(Integer)
    storage_path = Column(String)
    is_classified = Column(Boolean, default=False)
    
    message = relationship("MailMessage")

class MailFirMapping(Base):
    __tablename__ = 'mail_fir_mapping'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(Integer, ForeignKey('mail_messages.id'))
    fir_number = Column(String, index=True)
    ack_number = Column(String, index=True, nullable=True)
    confidence_score = Column(Integer, default=100) # 0-100
    mapped_at = Column(DateTime, default=datetime.utcnow)

class MailAuditLog(Base):
    __tablename__ = 'mail_audit_logs'
    
    id = Column(Integer, primary_key=True)
    action_type = Column(String, index=True) # e.g., "SEND", "SYNC", "READ"
    actor = Column(String) # User who performed the action
    target_id = Column(String, nullable=True) # Message ID or Folder ID
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
