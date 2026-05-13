import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from .config import settings
from .logger import app_logger
import os

# Configure Tesseract path if provided
if settings.TESSERACT_PATH and os.path.exists(settings.TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

def extract_text_via_ocr(file_path):
    """
    Converts PDF pages to images and performs OCR using Tesseract.
    """
    text = ""
    try:
        app_logger.info(f"Starting OCR for: {file_path}")
        app_logger.info(f"Using Poppler Path: {settings.POPPLER_PATH}")
        
        # Convert PDF to list of PIL Image objects
        images = convert_from_path(file_path, poppler_path=settings.POPPLER_PATH)
        app_logger.info(f"Successfully converted PDF to {len(images)} images.")
        
        for i, image in enumerate(images):
            # Perform OCR on each image
            app_logger.info(f"Processing page {i+1} with Tesseract...")
            page_text = pytesseract.image_to_string(image, lang='eng+hin')
            text += page_text + "\n"
            app_logger.debug(f"OCR completed for page {i+1}")
            
        return text.strip()
    except Exception as e:
        app_logger.error(f"OCR failed for {file_path}: {e}")
        return None
