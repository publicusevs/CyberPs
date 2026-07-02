const fs = require('fs');
const content = fs.readFileSync('D:/Projects/Vij/CyberPs/backend/uploads/notices/19/Others/19_Indian_Overseas_Bank.pdf', 'utf8');
console.log(content.substring(0, 1000));
