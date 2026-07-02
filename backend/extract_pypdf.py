import PyPDF2
import sys

def extract_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        with open('parsed_pdf.txt', 'w', encoding='utf-8') as f2:
            f2.write(text)
        print("Done")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    extract_text(r'D:\Cyber\Cyber FIRs\FIR_IIFI_27998001230053.pdf')
