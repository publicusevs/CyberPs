const { poolPromise, mssql } = require('./src/config/db');

async function createTable() {
    try {
        const pool = await poolPromise;
        console.log('Connecting to database...');

        const query = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='legal_notices' AND xtype='U')
        BEGIN
            CREATE TABLE legal_notices (
                notice_id INT PRIMARY KEY IDENTITY(1,1),
                case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
                police_station_id INT FOREIGN KEY REFERENCES police_stations(police_station_id),
                platform_name NVARCHAR(50),
                legal_sections NVARCHAR(255),
                issued_by NVARCHAR(100),
                receiver_name NVARCHAR(150),
                receiver_address NVARCHAR(MAX),
                receiver_email NVARCHAR(255),
                target_account_details NVARCHAR(MAX),
                requested_data_points NVARCHAR(MAX),
                notice_content NVARCHAR(MAX),
                status NVARCHAR(20) DEFAULT 'Draft',
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            );
            PRINT 'legal_notices table created successfully.';
        END
        ELSE
        BEGIN
            PRINT 'legal_notices table already exists.';
        END
        `;

        await pool.request().query(query);
        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

createTable();
