def deduplicate_text(text_list):
    result = []
    for t in text_list:
        if len(t) < 5: continue
        joined = " ".join(result)
        # Check if t is already in the result
        # Also check if it's very similar to something in result
        if t in joined:
            continue
            
        # Sometimes there's a trailing space or newline difference
        if t.strip() in joined:
            continue
            
        result.append(t)
    return " ".join(result).strip()

import json
data = json.load(open(r"D:\Projects\Vij\CyberPs\backend\layout_test_clean.json", encoding="utf-8"))
old_text = data["brief_facts"]

import re
chunks = []
current_chunk = []
for word in old_text.split(" "):
    current_chunk.append(word)
    if len(current_chunk) > 50:
        chunks.append(" ".join(current_chunk))
        current_chunk = []
if current_chunk: chunks.append(" ".join(current_chunk))

print("Old Length:", len(old_text))
new_text = deduplicate_text(chunks)
print("New Length:", len(new_text))
