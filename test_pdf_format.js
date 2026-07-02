const fs = require('fs'); 
const content = fs.readFileSync('D:/Projects/Vij/CyberPs/backend/uploads/notices/19/Others/19_Indian_Overseas_Bank.pdf', 'binary'); 
console.log('Contains /DCTDecode:', content.includes('/DCTDecode')); 
console.log('Contains /FlateDecode:', content.includes('/FlateDecode'));
