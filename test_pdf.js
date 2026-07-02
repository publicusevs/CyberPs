const fs = require('fs');
const content = fs.readFileSync('D:/Projects/Vij/CyberPs/backend/uploads/notices/19/Others/19_Indian_Overseas_Bank.pdf');
console.log('Size:', content.length);
const matches = content.toString('binary').match(/\/Type\s*\/Page\b/g);
console.log('Pages:', matches ? matches.length : 0);
