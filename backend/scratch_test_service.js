require('dotenv').config({ path: './.env' });
const CasesService = require('./src/modules/cases/cases.service');

async function test() {
    try {
        console.log('Testing CasesService.updateFullCase for case 34...');
        
        // Let's first query the case
        const initialCase = await CasesService.getCaseById(34, null, true);
        
        // Prepare data mimicking exactly what CaseForm.jsx sends
        const mockData = {
            fir_no: initialCase.case.fir_no,
            ackn_no: initialCase.case.ackn_no,
            fir_year: initialCase.case.fir_year,
            district: initialCase.case.district_id,
            police_station: initialCase.case.police_station_id,
            fir_date: '2026-05-31',
            fir_time: '01:59',
            occurrence_date_from: '2026-05-30',
            occurrence_time_from: '07:30',
            occurrence_date_to: '2026-05-30',
            occurrence_time_to: '08:30',
            info_received_date: '2026-05-31',
            info_received_time: '01:59',
            gd_no: 'GD123',
            place_of_incident: 'Jaipur',
            fraud_amount: '2260000',
            description: 'Test update description',
            assigned_to: '1',
            sho_details: 'SHO Jaipur',
            priority_id: '3',
            status_id: '1',
            complainant_name: 'Complainant Name Test',
            complainant_mobile: '9876543210',
            complainant_email: 'comp@test.com',
            complainant_aadhaar: '123456789012',
            complainant_pan: 'ABCDE1234F',
            complainant_address: 'Jaipur Road',
            is_victim_same: 'false',
            victim_name: 'Victim Name Test',
            victim_mobile: '8765432109',
            victim_email: 'victim@test.com',
            victim_address: 'Jaipur Center',
            bank_name: 'SBI Bank',
            account_no: '3029102930',
            accusedList: JSON.stringify([
                {
                    name: 'Accused 1',
                    alias: 'A1',
                    mobile: '7654321098',
                    whatsapp_no: '7654321098',
                    gmail_id: 'acc1@gmail.com',
                    facebook_id: 'acc1fb',
                    twitter_id: 'acc1x',
                    linkedin_id: 'acc1li',
                    insta_id: 'acc1ig',
                    telegram_id: 'acc1tg',
                    website_url: 'http://acc1.com',
                    other_social: 'none'
                }
            ])
        };

        const result = await CasesService.updateFullCase(34, mockData, null);
        console.log('Update result:', result);
        console.log('Update completed with NO errors!');
    } catch (e) {
        console.error('Error during CasesService.updateFullCase:', e);
    } finally {
        process.exit(0);
    }
}
test();
