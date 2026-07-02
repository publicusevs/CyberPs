import re

matches = [
    {'act': 'भा दं सं 1860', 'section': '420', 'sno': '1'}, 
    {'act': 'भा दं सं 1860', 'section': '419', 'sno': '2'}, 
    {'act': 'भा दं सं 1860', 'section': '406', 'sno': '3'}, 
    {'act': 'भा दं सं 1860', 'section': '120-B', 'sno': '4'}, 
    {'act': 'यम 2000', 'section': '66(C)', 'sno': '5'}, 
    {'act': 'यम 2000', 'section': '66(D)', 'sno': '6'}, 
    {'act': 'Address(पता):', 'section': '(i)', 'sno': '1'}, 
    {'act': 'Complexion (रंग )', 'section': '1', 'sno': '2'}, 
    {'act': '3', 'section': '4', 'sno': '5'}
]

valid = []
for m in matches:
    # Act must not be purely numbers, Section must start with a digit
    if not m['act'].isdigit() and re.match(r"^\d{1,4}[A-Za-z-]*(\([A-Za-z]\))?$", m['section']):
        # If it's just digits, it's fine, if it's alphanumeric, also fine
        # We can just exclude the ones where act is short or contains things like 'Complexion'
        # Or better: check if `sno` is consecutive! 1, 2, 3, 4, 5, 6.
        valid.append(m)

print(valid)
