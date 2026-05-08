const { poolPromise, mssql } = require('./src/config/db');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('--- Starting Police Station Table Migration ---');

        const query = `
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'police_station_type')
                ALTER TABLE police_stations ADD police_station_type NVARCHAR(50);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'pincode')
                ALTER TABLE police_stations ADD pincode NVARCHAR(10);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'phone')
                ALTER TABLE police_stations ADD phone NVARCHAR(20);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'alternate_phone')
                ALTER TABLE police_stations ADD alternate_phone NVARCHAR(20);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'email')
                ALTER TABLE police_stations ADD email NVARCHAR(100);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'helpline_number')
                ALTER TABLE police_stations ADD helpline_number NVARCHAR(20);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'head_name')
                ALTER TABLE police_stations ADD head_name NVARCHAR(100);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'head_rank')
                ALTER TABLE police_stations ADD head_rank NVARCHAR(50);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'head_mobile')
                ALTER TABLE police_stations ADD head_mobile NVARCHAR(15);

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('police_stations') AND name = 'is_active')
                ALTER TABLE police_stations ADD is_active BIT DEFAULT 1;
        `;

        await pool.request().query(query);
        console.log('✔ Police Station table updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('✘ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
