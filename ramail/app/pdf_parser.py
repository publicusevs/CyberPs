import pdfplumber
from .logger import app_logger

def extract_text_from_pdf(file_path):
    """
    Extracts text from a digital PDF file.
    """
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        return text.strip()
    except Exception as e:
        app_logger.error(f"Error parsing digital PDF {file_path}: {e}")
        return None
