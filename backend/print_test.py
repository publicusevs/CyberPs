import json

with open('backend/layout_test.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for k, v in data.items():
    print(f"--- {k} ---")
    if isinstance(v, list):
        for item in v: print(item)
    elif isinstance(v, dict):
        for subk, subv in v.items():
            print(f"  {subk}: {subv}")
    else:
        print(v)
