const fs = require('fs');

const content = fs.readFileSync('backend/src/modules/cases/cases.controller.js', 'utf8');

// Find the first occurrence of /**
const idx1 = content.indexOf('/**');
// Find the second occurrence of /**
const idx2 = content.indexOf('/**', idx1 + 1);

if (idx2 !== -1) {
    // We have a duplicate!
    // The first block is corrupted (ends at reject(new Error(...))
    // Let's just keep from the second /** to the end.
    const goodContent = content.substring(idx2);
    fs.writeFileSync('backend/src/modules/cases/cases.controller.js', goodContent);
    console.log("Fixed!");
} else {
    console.log("No duplicate found");
}
