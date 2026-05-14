require('dotenv').config();
const { poolPromise } = require('./src/config/db');

async function seedTemplate() {
    try {
        const pool = await poolPromise;
        const htmlContent = `
<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000; padding: 40px; border: 1px solid #ccc; max-width: 800px; margin: auto;">
    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">CYBER POLICE STATION, POLICE COMMISSIONERATE,</h2>
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">JAIPUR, RAJASTHAN, INDIA -302001</h2>
        <p style="margin: 5px 0 0 0; font-weight: bold;">E-mail: pscybersplcrime.jpr@gov.in, Ph.: +91-141-2360094</p>
    </div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 20px;">
        <div>No. - {DISPATCH_NO}</div>
        <div>Dated: - {DATE}</div>
    </div>
    <div style="text-align: center; font-weight: bold; font-size: 16px; text-decoration: underline; margin-bottom: 20px;">
        Notice Under Section 94 & 106 B.N.S.S. 2023
    </div>
    <div style="margin-bottom: 20px;">
        <p style="margin: 0;">To,</p>
        <p style="margin: 0;">The Nodal/Branch Manager</p>
        <p style="margin: 0; font-weight: bold;">{BANK_NAME}</p>
        <p style="margin: 0;">{BANK_ADDRESS}</p>
    </div>
    <div style="margin-bottom: 20px; text-align: justify;">
        <p style="margin: 0;"><strong>Sub:</strong> - Regarding seek information of fraudulent bank account no <strong>{ACCOUNT_NO}</strong>.</p>
        <p style="margin: 5px 0 0 0;"><strong>Ref:</strong> - FIR No. 58/2025 U/s 319(2), 318(4), 316(2), 61(2)(B) & 66C, 66D IT Act, Cyber Police Station, Police Commissionerate Jaipur (Raj.) and NCRP Ack No. 32704250028250.</p>
    </div>
    <div style="margin-bottom: 20px; text-align: justify;">
        <p>Respected Sir/Madam,</p>
        <p>We are investigating a case of financial fraud as per referred above. During our investigation we have found that the person in question has made fraudulent payments into multiple accounts, one of those accounts belongs to {BANK_NAME}. So please provide following account details.</p>
    </div>
    <div style="margin-bottom: 20px; font-weight: bold;">
        ACCOUNT NO &ndash; {ACCOUNT_NO} IFSC: {IFSC_CODE}
    </div>
    <div style="margin-bottom: 30px; text-align: justify;">
        <p>For the further investigation of the same kindly provide as the below requested details.</p>
        <ol style="margin-top: 10px; padding-left: 20px;">
            <li style="margin-bottom: 5px;"><strong>Certified copy of Account Statement from Account Opening to till date.</strong></li>
            <li style="margin-bottom: 5px;">Certified copy of Account Opening Form and full <strong>KYC</strong>.</li>
            <li style="margin-bottom: 5px;"><strong>Provide details of beneficiary transactions of the bank account.</strong></li>
            <li style="margin-bottom: 5px;">Present register <strong>Mob. No. and Email Id.</strong></li>
            <li style="margin-bottom: 5px;">Provide change list of mobile number and Email id.</li>
            <li style="margin-bottom: 5px;">Provide UPI ID linked to this account.</li>
            <li style="margin-bottom: 5px;">Please provide ATM card details &amp; delivery address.</li>
            <li style="margin-bottom: 5px;"><strong>Debit Freeze</strong> this Account.</li>
            <li style="margin-bottom: 5px;"><strong>Provide IP logs during online account opening and transaction.</strong></li>
            <li style="margin-bottom: 5px;"><strong>Provide the mobile number on which OTP is verified during account opening.</strong></li>
            <li style="margin-bottom: 5px;">Any other useful information.</li>
        </ol>
        <p>Thanks and Regards.</p>
    </div>
    <div style="text-align: right; margin-bottom: 30px;">
        <p style="margin: 0; font-weight: bold;">Investigation Officer</p>
        <p style="margin: 0;">Cyber Police Station,</p>
        <p style="margin: 0;">Police Commissionerate, Jaipur</p>
        <p style="margin: 0;">Rajasthan, India</p>
        <p style="margin: 0;">Mob- 9414717552</p>
    </div>
    <div style="margin-bottom: 30px; font-size: 13px;">
        <p style="margin: 0;">Copy to: Hon&rsquo;ble court of Additional Chief Judicial Magistrate -8 Metro &ndash;I Jaipur, Rajasthan.</p>
    </div>
    <div style="text-align: left;">
        <p style="margin: 0; font-weight: bold;">Investigation Officer</p>
        <p style="margin: 0;">Cyber Police Station,</p>
        <p style="margin: 0;">Police Commissionerate, Jaipur</p>
        <p style="margin: 0;">Rajasthan, India</p>
    </div>
</div>
`;

        const jsonData = JSON.stringify({
            fields: [
                {name: 'DISPATCH_NO', type: 'text', defaultValue: 'CYB/2026/0001'},
                {name: 'DATE', type: 'text', defaultValue: '14/05/2026'},
                {name: 'BANK_NAME', type: 'text', defaultValue: 'Axis Bank'},
                {name: 'BANK_ADDRESS', type: 'text', defaultValue: 'Gurgaon, Haryana'},
                {name: 'ACCOUNT_NO', type: 'text', defaultValue: '924020018206538'},
                {name: 'IFSC_CODE', type: 'text', defaultValue: 'UTIB0001527'},
            ],
            table_columns: [],
            mapping: {},
            margins: {top: 40, left: 40, right: 40}
        });

        await pool.request().query(`
            UPDATE templates 
            SET template_name = 'Standard KYC Request', 
                subject_text = 'Notice Under Section 94 & 106', 
                body_text = N'${htmlContent.replace(/'/g, "''")}', 
                footer_text = '', 
                json_data = N'${jsonData.replace(/'/g, "''")}', 
                updated_at = GETDATE()
            WHERE template_type = 'KYC_REQUEST'
        `);
        console.log('Template seeded successfully!');
    } catch (err) {
        console.error('Error seeding template:', err);
    } finally {
        process.exit(0);
    }
}

seedTemplate();
