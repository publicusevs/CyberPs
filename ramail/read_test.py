import os
import json
import time
from exchangelib import FileAttachment
from app.utils import get_exchange_account
from app.logger import app_logger
from app.sensitive_detector import detect_sensitive_content
from app.summarizer import generate_detailed_case_summary
from app.pdf_parser import extract_text_from_pdf
from app.ocr_reader import extract_text_via_ocr

def read_save_with_ai_summary(count=5):
    try:
        account = get_exchange_account()
        
        # Base directories
        inbox_dir = "inbox"
        sensitive_base_dir = os.path.join(inbox_dir, "sensitive")
        summary_dir = "summaries"
        
        for d in [inbox_dir, sensitive_base_dir, summary_dir]:
            os.makedirs(d, exist_ok=True)

        print(f"[*] Fetching the top {count} emails...")
        messages = account.inbox.all().order_by('-datetime_received')[:count]

        for i, msg in enumerate(messages, 1):
            try:
                subject_text = msg.subject if msg.subject else "No Subject"
                print(f"\n[{i}] Processing: {subject_text}")
                
                # Extract combined text (Subject + Body)
                all_text = f"{msg.subject}\n{msg.text_body}\n"
                
                # Temporary storage for attachments to extract text
                attachments_text = ""
                current_attachments = []
                
                if msg.attachments:
                    for attachment in msg.attachments:
                        if isinstance(attachment, FileAttachment) and attachment.name.lower().endswith('.pdf'):
                            # Save temporarily for analysis
                            # Use timestamp to avoid name collisions
                            temp_name = f"temp_{int(time.time())}_{attachment.name}"
                            temp_path = os.path.abspath(temp_name)
                            
                            try:
                                with open(temp_path, 'wb') as f:
                                    f.write(attachment.content)
                                
                                # Extract text
                                text = extract_text_from_pdf(temp_path)
                                if not text or len(text) < 50:
                                    text = extract_text_via_ocr(temp_path)
                                
                                attachments_text += (text or "") + "\n"
                                current_attachments.append((temp_path, attachment.name, attachment.content))
                            except Exception as ex:
                                print(f"    [!] Error processing attachment {attachment.name}: {ex}")

                all_text += attachments_text
                
                # Check Sensitivity
                is_sensitive, keywords = detect_sensitive_content(all_text)
                
                safe_subject = "".join([c for c in subject_text[:40] if c.isalnum() or c in (' ', '_')]).rstrip()
                date_str = msg.datetime_received.strftime("%Y-%m-%d")
                folder_name = f"{date_str}_{safe_subject}"
                
                target_dir = sensitive_base_dir if is_sensitive else inbox_dir
                
                # 1. Save Body
                body_path = os.path.join(target_dir, f"{folder_name}.txt")
                try:
                    with open(body_path, 'w', encoding='utf-8') as f:
                        f.write(f"Subject: {msg.subject}\nFrom: {msg.sender.email_address}\n\n{msg.text_body}")
                except PermissionError:
                    print(f"    [!] Warning: Could not save body to {body_path} (File is open)")

                # 2. Generate and Save AI Summary if Sensitive
                if is_sensitive:
                    print(f"    [!] Sensitive detected (Keywords: {keywords}). Generating AI Case Details...")
                    case_details = generate_detailed_case_summary(all_text)
                    if case_details:
                        summary_path = os.path.join(summary_dir, f"{folder_name}_case_report.json")
                        try:
                            with open(summary_path, 'w', encoding='utf-8') as f:
                                json.dump(case_details, f, indent=2, ensure_ascii=False)
                            print(f"    [+] AI Summary saved: {summary_path}")
                        except PermissionError:
                            print(f"    [!] Warning: Could not save summary to {summary_path}")

                # 3. Save Attachments
                if current_attachments:
                    attach_dir = os.path.join(target_dir, "attachment", folder_name)
                    os.makedirs(attach_dir, exist_ok=True)
                    for temp_path, name, content in current_attachments:
                        final_attach_path = os.path.join(attach_dir, name)
                        try:
                            with open(final_attach_path, 'wb') as f:
                                f.write(content)
                            print(f"    [attachment] -> {name}")
                        except PermissionError:
                            print(f"    [!] Permission Denied for {name}. Please close the file.")
                        finally:
                            if os.path.exists(temp_path): 
                                try: os.remove(temp_path)
                                except: pass

            except Exception as e:
                print(f"    [!] Error processing email {i}: {e}")

        print(f"\n[+] Task Completed!")

    except Exception as e:
        print(f"[!] Critical Error: {e}")

if __name__ == "__main__":
    read_save_with_ai_summary(5)
