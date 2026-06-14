require('dotenv').config({ path: './.env' });
const CasesService = require('./src/modules/cases/cases.service');

async function test() {
    try {
        console.log('Testing updateFullCase with undefined victim fields...');
        const mockData = {
            fir_no: '63',
            complainant_name: 'Complainant Test',
            is_victim_same: 'true'
            // no victim fields passed
        };
        await CasesService.updateFullCase(34, mockData, null);
        console.log('Success!');
    } catch (e) {
        console.error('Error caught:', e.message, '\nStack:', e.stack);
    } finally {
        process.exit(0);
    }
}
test();
