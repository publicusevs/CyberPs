import os
import json
from exchangelib import FileAttachment
from .config import settings
from .logger import app_logger
from .pdf_parser import extract_text_from_pdf
from .ocr_reader import extract_text_via_ocr
from .sensitive_detector import detect_sensitive_content
from .summarizer import generate_detailed_case_summary

def process_and_download_attachments(message):
    """
    Downloads, analyzes, and classifies attachments.
    """
    processed_files = []
    total_is_sensitive = False
    all_extracted_text = ""

    if not message.attachments:
        return [], False, {}

    temp_paths = []
    
    # 1. First Pass: Download and Extract Text
    for attachment in message.attachments:
        # Support both exchangelib's FileAttachment and our MockAttachment
        if hasattr(attachment, 'content') and hasattr(attachment, 'name'):
            # Save temporarily to analyze
            temp_path = os.path.join(settings.NORMAL_DIR, f"temp_{attachment.name}")
            with open(temp_path, 'wb') as f:
                f.write(attachment.content)
            
            extracted_text = ""
            if attachment.name.lower().endswith('.pdf'):
                # Try digital extraction
                extracted_text = extract_text_from_pdf(temp_path)
                # If digital extraction fails or is very short, try OCR
                if not extracted_text or len(extracted_text) < 50:
                    app_logger.info(f"Digital extraction failed for {attachment.name}, attempting OCR...")
                    extracted_text = extract_text_via_ocr(temp_path)
            
            all_extracted_text += (extracted_text or "") + "\n"
            temp_paths.append((temp_path, attachment.name, extracted_text))

    # 2. Second Pass: Classify based on accumulated text
    is_sensitive, keywords = detect_sensitive_content(all_extracted_text)
    
    # 3. Third Pass: Move to final folders and generate summaries
    summary = {}
    if all_extracted_text.strip():
        summary = generate_detailed_case_summary(all_extracted_text)
        # If AI says it's sensitive, respect that too
        if summary.get("sensitive"):
            is_sensitive = True

    target_dir = settings.SENSITIVE_DIR if is_sensitive else settings.NORMAL_DIR
    
    for temp_path, original_name, _ in temp_paths:
        final_path = os.path.join(target_dir, original_name)
        os.replace(temp_path, final_path)
        processed_files.append(final_path)
        app_logger.info(f"File {original_name} classified as {'SENSITIVE' if is_sensitive else 'NORMAL'}")

    # Save summary JSON
    if summary:
        summary_filename = f"{message.datetime_received.strftime('%Y%m%d_%H%M%S')}_summary.json"
        summary_path = os.path.join(settings.SUMMARY_DIR, summary_filename)
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)

    return processed_files, is_sensitive, summary
