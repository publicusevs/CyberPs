const { poolPromise } = require('./src/config/db');

async function run() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            INSERT INTO templates (template_name, template_type, subject_text, body_text, footer_text, json_data, created_at, updated_at) 
            VALUES (
                'Generic Mail Template', 
                'Mail', 
                'Regarding FIR No. {FIR_NO} dated {FIR_DATE} - Request for Information', 
                '<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;"><h3 style="color: #c75a57; border-bottom: 2px solid #c75a57; padding-bottom: 10px;">OFFICIAL INVESTIGATION NOTICE</h3><p>Respected Nodal Officer,</p><p>We are the Cyber Crime Police Station investigating <b>FIR No. {FIR_NO} dated {FIR_DATE}</b>.</p><p>Please find attached the legal notice under <b>Section 94/106 BNSS 2023</b> regarding investigative proceedings for the mentioned case.</p><p>You are requested to take immediate action as per the instructions in the attached document and provide the required information at the earliest.</p><div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;"><small><b>Entity Name:</b> {{bankName}}</small></div><p>Regards,<br/><b>{Investigating_Officer}</b><br/>{IO_Designation}<br/>{Police_Station_Name}, {District_Name}</p></div>', 
                '', 
                '{}', 
                GETDATE(), 
                GETDATE()
            )
        `);
        console.log('Template inserted successfully');
    } catch (err) {
        console.error('Error inserting template:', err);
    } finally {
        process.exit(0);
    }
}

run();
