import fitz
doc = fitz.open(r"D:\Cyber\Cyber FIRs\FIR_IIFI_27998001240163.pdf")
for i in range(len(doc)):
    text = doc[i].get_text()
    if "सत्यनारायण गुप्ता" in text:
        print(f"Page {i}: Found narrative!")
        print(f"Length of narrative on this page: {len(text)}")
