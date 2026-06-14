const axios = require('axios');

async function run() {
    try {
        console.log('Logging in to get JWT token...');
        const loginRes = await axios.post('http://localhost:5174/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (!loginRes.data.success) {
            console.error('Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.token || loginRes.data.data?.token;
        console.log('JWT Token retrieved successfully!');

        // Mock case update payload
        const updatePayload = {
            fir_no: '63',
            ackn_no: '78797974343',
            fir_year: '2026',
            district: '1',
            police_station: '1',
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
            description: 'Test update description HTTP',
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

        console.log('Sending PUT request to update case 34...');
        // Since backend expects multipart/form-data:
        const FormData = require('form-data');
        const form = new FormData();
        Object.keys(updatePayload).forEach(key => {
            form.append(key, updatePayload[key]);
        });

        const updateRes = await axios.put('http://localhost:5174/api/cases/34/full', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', updateRes.status);
        console.log('Response body:', updateRes.data);
    } catch (e) {
        console.error('HTTP Error:');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Body:', JSON.stringify(e.response.data));
        } else {
            console.error(e.message);
        }
    }
}

run();
