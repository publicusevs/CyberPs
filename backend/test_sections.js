const fs = require('fs');

const text = fs.readFileSync('ocr_result_1.txt', 'utf8');

const sectionBlockMatch = text.match(/(?:\(धाराएँ\)|Sections)([\s\S]*?)(?:3\.\s*\(a\)|Occurrence of offence|अपराध की)/i);

if (sectionBlockMatch) {
    const block = sectionBlockMatch[1];
    console.log("BLOCK:");
    console.log(block);
    
    const sectionRegex = /\b\d{2,4}(?:-[A-Za-z]+|\([A-Za-z]+\))?/g;
    
    // Since 1860 and 2000 are years, we should filter them out
    const matches = [...block.matchAll(sectionRegex)].map(m => m[0]);
    const filtered = matches.filter(s => {
        const num = parseInt(s, 10);
        return s !== '1860' && s !== '2000' && s !== '860' && num > 9;
    });
    
    console.log("SECTIONS:");
    console.log(filtered.join(', '));
} else {
    console.log("No section block found");
}
