import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"backend/raw_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Let's target Acts and Sections based on the table format.
# A row usually looks like:
# [Act Name]
# [Section]
# [S.No (1, 2, 3)]

matches = re.findall(r"^(.*?)\n^([0-9A-Za-z-()]+)\n^(\d+)$", text, re.MULTILINE)
valid_matches = []
for m in matches:
    act, section, sno = m
    act = act.strip()
    # Filter out bad matches
    if len(sno) < 4 and len(section) < 15 and section != sno:
        valid_matches.append({"act": act, "section": section, "sno": sno})

print("Matches:", valid_matches)
