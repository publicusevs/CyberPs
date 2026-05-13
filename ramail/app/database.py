from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from .config import settings

Base = declarative_base()

class EmailProcessLog(Base):
    __tablename__ = 'email_process_logs'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String, unique=True)
    sender = Column(String)
    subject = Column(String)
    received_at = Column(DateTime)
    processed_at = Column(DateTime, default=datetime.utcnow)
    is_sensitive = Column(Boolean, default=False)
    summary_json = Column(JSON)
    attachment_paths = Column(JSON)

# Database Engine
engine = create_engine(settings.DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def log_processed_email(msg_id, sender, subject, received_at, is_sensitive, summary, paths):
    db = SessionLocal()
    try:
        log_entry = EmailProcessLog(
            message_id=msg_id,
            sender=sender,
            subject=subject,
            received_at=received_at,
            is_sensitive=is_sensitive,
            summary_json=summary,
            attachment_paths=paths
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
