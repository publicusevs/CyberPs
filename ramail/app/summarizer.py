import json
import openai
from .config import settings
from .logger import app_logger

# Initialize OpenAI Client
client = None
if settings.OPENAI_API_KEY:
    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as e:
        app_logger.error(f"Failed to initialize OpenAI client: {e}")

def generate_detailed_case_summary(text):
    """
    Uses AI to analyze cyber fraud documents and extract detailed case information.
    """
    if not client or not settings.OPENAI_API_KEY:
        app_logger.warning("OpenAI API Key missing. Skipping detailed AI summarization.")
        return None

    prompt = f"""
    Analyze the following document text related to a cyber fraud complaint.
    Extract the information into the EXACT JSON structure provided below.
    Use Hindi/English as appropriate for the description.

    TEXT TO ANALYZE:
    {text[:5000]}

    JSON STRUCTURE REQUIRED:
    {{
      "main_details": {{
        "complaint_category": "e.g. Online Financial Fraud",
        "sub_category": "e.g. UPI Related Frauds",
        "complaint_status": "e.g. Under Process",
        "reported_amount": "value with currency",
        "lien_amount_hold": "value with currency",
        "incident_date": "DD/MM/YYYY",
        "complaint_accepted_date": "DD/MM/YYYY"
      }},
      "fraud_description": "Detailed summary of the incident (what happened, platforms used like WhatsApp/Google Pay, etc.)",
      "transaction_details": {{
        "platform": "e.g. Google Pay / PhonePe",
        "transaction_ids": ["List of IDs"],
        "banks_involved": ["List of Banks like SBI, PNB"],
        "action_taken": "Summary of actions like hold/lien",
        "atm_entries_detected": true/false
      }},
      "current_action": {{
        "cyber_police_status": "Status in cyber police system",
        "bank_action": "Action taken by specific banks"
      }}
    }}
    """

    try:
        response = client.chat.completions.create(
            model=settings.AI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        summary_json = json.loads(response.choices[0].message.content)
        return summary_json
    except Exception as e:
        app_logger.error(f"Detailed AI Summarization failed: {e}")
        return {"error": str(e)}
