require('dotenv').config();
const mssql = require('mssql');

mssql.connect(process.env.DB_CONNECTION_STRING || {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {encrypt: false, trustServerCertificate: true}
}).then(async pool => {
    try {
        const res = await pool.request().query("SELECT body_text FROM templates WHERE template_name = 'banknotice_94_106'");
        let text = res.recordset[0].body_text;
        
        // Find the "Rajasthan, India" part
        const target = 'India</span><span lang="EN" style="font-size:12.0pt"><o:p></o:p></span></p>';
        const replacement = target + '\n<hr style="border: none; border-top: solid black 1.5pt; margin-top: 50px; margin-bottom: 20px;" />';
        
        if (text.includes(target) && !text.includes('<hr style="border: none; border-top: solid black 1.5pt')) {
            text = text.replace(target, replacement);
            await pool.request()
                .input('text', mssql.NVarChar(mssql.MAX), text)
                .query("UPDATE templates SET body_text = @text WHERE template_name = 'banknotice_94_106'");
            console.log('Successfully added bottom margin line');
        } else {
            console.log('Target not found or already added');
        }
    } catch(e) {
        console.error(e.message);
    }
    process.exit();
});
