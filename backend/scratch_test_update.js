require('dotenv').config({ path: './.env' });
const { poolPromise } = require('./src/config/db');
const CasesRepository = require('./src/modules/cases/cases.repository');

async function test() {
    try {
        const pool = await poolPromise;
        const transaction = new (require('mssql').Transaction)(pool);
        await transaction.begin();

        console.log('Fetching case 34 details for test...');
        const caseData = await CasesRepository.getById(34, null);
        if (!caseData) {
            console.log('Case 34 not found!');
            await transaction.rollback();
            process.exit(0);
        }

        console.log('Found case:');
        console.log(JSON.stringify(caseData.case));

        // Form fields as they would come from frontend
        const mockFields = {
            fir_no: caseData.case.fir_no,
            ackn_no: caseData.case.ackn_no,
            fir_year: caseData.case.fir_year,
            district: caseData.case.district_id,
            police_station: caseData.case.police_station_id,
            fir_date: caseData.case.fir_datetime ? new Date(caseData.case.fir_datetime).toISOString().split('T')[0] : '',
            fir_time: caseData.case.fir_datetime ? new Date(caseData.case.fir_datetime).toISOString().split('T')[1].substring(0, 5) : '',
            occurrence_date_from: caseData.case.occurrence_from_datetime ? new Date(caseData.case.occurrence_from_datetime).toISOString().split('T')[0] : '',
            occurrence_time_from: caseData.case.occurrence_from_datetime ? new Date(caseData.case.occurrence_from_datetime).toISOString().split('T')[1].substring(0, 5) : '',
            occurrence_date_to: caseData.case.occurrence_to_datetime ? new Date(caseData.case.occurrence_to_datetime).toISOString().split('T')[0] : '',
            occurrence_time_to: caseData.case.occurrence_to_datetime ? new Date(caseData.case.occurrence_to_datetime).toISOString().split('T')[1].substring(0, 5) : '',
            info_received_date: caseData.case.info_received_datetime ? new Date(caseData.case.info_received_datetime).toISOString().split('T')[0] : '',
            info_received_time: caseData.case.info_received_datetime ? new Date(caseData.case.info_received_datetime).toISOString().split('T')[1].substring(0, 5) : '',
            gd_no: caseData.case.gd_entry_no,
            place_of_incident: caseData.case.place_of_occurrence,
            fraud_amount: caseData.case.fraud_amount,
            description: caseData.case.description,
            assigned_to: caseData.case.assigned_to,
            status_id: caseData.case.status_id,
            priority_id: caseData.case.priority_id
        };

        console.log('Running CasesRepository.updateCase with mock fields...');
        await CasesRepository.updateCase(transaction, 34, mockFields);
        console.log('Successfully completed CasesRepository.updateCase');

        await transaction.rollback();
        console.log('Transaction rolled back successfully.');
    } catch (e) {
        console.error('Error during updateCase execution:', e);
    } finally {
        process.exit(0);
    }
}
test();
