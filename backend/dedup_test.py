def deduplicate_text(text_list):
    seen = set()
    result = []
    for t in text_list:
        if len(t) > 20: # Only deduplicate larger chunks
            if t in seen:
                continue
            seen.add(t)
        result.append(t)
    return " ".join(result).strip()

def extract_narrative(pages_blocks):
    narrative_text = []
    recording = False
    
    for blocks in pages_blocks:
        for b in blocks:
            text = b['text']
            
            if re.search(r"First Information contents", text, re.IGNORECASE) or re.search(r"प्रथम सूचना तथ्य", text):
                recording = True
                continue
                
            if recording:
                if (re.search(r"Signature\s*/\s*Thumb\s*impression", text, re.IGNORECASE) or 
                    re.search(r"हस्ताक्षर\s*/\s*अंगूठे का निशान", text) or
                    re.search(r"F\.I\.R\. read over to the complainant", text, re.IGNORECASE)):
                    recording = False
                    break
                    
                if re.search(r"I\.I\.F\.-I", text) or re.search(r"FIRST INFORMATION REPORT", text):
                    continue
                    
                narrative_text.append(text)
                
    return deduplicate_text(narrative_text)
