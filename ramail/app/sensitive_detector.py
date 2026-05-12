import re

SENSITIVE_KEYWORDS = [
    "cyber crime", "fraud", "complaint", "transaction", "disputed", 
    "bank", "atm", "upi", "cyberpolice", "fir", "account number", 
    "debit", "lien", "hold amount", "suspect", "recovery", "factual report"
]

def detect_sensitive_content(text):
    """
    Scans text for sensitive keywords related to fraud and legal complaints.
    Returns True if sensitive, else False.
    """
    if not text:
        return False
        
    text_lower = text.lower()
    
    found_keywords = []
    for keyword in SENSITIVE_KEYWORDS:
        if keyword in text_lower:
            found_keywords.append(keyword)
            
    # If at least 2 keywords found, or specific high-risk ones like 'fraud' or 'fir'
    high_risk_triggers = ["fraud", "fir", "cyber crime", "factual report"]
    
    is_sensitive = len(found_keywords) >= 2 or any(k in text_lower for k in high_risk_triggers)
    
    return is_sensitive, found_keywords
