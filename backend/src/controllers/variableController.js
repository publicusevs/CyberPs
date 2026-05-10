const { poolPromise, mssql } = require('../config/db');

const ensureTableExists = async (pool) => {
    const tableCheck = await pool.request().query("SELECT * FROM sysobjects WHERE name='global_variables' AND xtype='U'");
    if (tableCheck.recordset.length === 0) {
        const createQuery = `
            CREATE TABLE global_variables (
                variable_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                variable_name NVARCHAR(100) NOT NULL UNIQUE,
                variable_value NVARCHAR(MAX),
                category NVARCHAR(50) DEFAULT 'General',
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            );
        `;
        await pool.request().query(createQuery);
        
        // Initial Seed Data based on user examples
        const seedQuery = `
            INSERT INTO global_variables (variable_name, variable_value, category) VALUES 
            ('Bank_of_Maharashtra', 'Bank of Maharashtra', 'Bank'),
            ('bankaccountnumber', '60538079358', 'Finance'),
            ('firnumber', '134/2025 & NCRP Ack No 22708250029322, 32708250060291', 'Case'),
            ('courtname', 'Special Cyber Court, Mumbai', 'Legal'),
            ('Police_Station_Name', 'Cyber Crime Police Station', 'Department'),
            ('District_Name', 'Mumbai City', 'Department'),
            ('State_Name', 'Maharashtra', 'Department'),
            ('Investigating_Officer', 'Inspector Rajesh Kumar', 'Officer'),
            ('IO_Designation', 'Inspector of Police', 'Officer'),
            ('IO_Contact', '9876543210', 'Officer'),
            ('Bank_Name', 'State Bank of India', 'Bank'),
            ('Branch_Name', 'Main Branch', 'Bank'),
            ('IFSC_Code', 'SBIN0001234', 'Bank'),
            ('System_Date', FORMAT(GETDATE(), 'dd/MM/yyyy'), 'System');
        `;
        await pool.request().query(seedQuery);
    }
};

exports.getAllVariables = async (req, res) => {
    try {
        const pool = await poolPromise;
        await ensureTableExists(pool);

        // Ensure critical defaults exist individually
        const defaults = [
            ['Police_Station_Name', 'Cyber Crime Police Station', 'Department'],
            ['Police_Station_Address', 'BKC, Bandra East, Mumbai, 400051', 'Department'],
            ['Police_Station_Phone', '022-26504000', 'Department'],
            ['District_Name', 'Mumbai City', 'Department'],
            ['State_Name', 'Maharashtra', 'Department'],
            ['Investigating_Officer', 'Inspector Rajesh Kumar', 'Officer'],
            ['IO_Designation', 'Inspector of Police', 'Officer'],
            ['IO_Contact', '9876543210', 'Officer'],
            ['IO_Mobile', '9876543210', 'Officer'],
            ['Bank_Name', 'State Bank of India', 'Bank'],
            ['Branch_Name', 'Main Branch', 'Bank'],
            ['IFSC_Code', 'SBIN0001234', 'Bank'],
            ['Court_Name', 'Special Cyber Court, Mumbai', 'Legal'],
            ['Court_Location', 'Esplanade, Mumbai', 'Legal'],
            ['System_Date', new Date().toLocaleDateString('en-GB'), 'System']
        ];

        for (const [name, value, category] of defaults) {
            await pool.request()
                .input('name', name)
                .input('value', value)
                .input('category', category)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM global_variables WHERE variable_name = @name)
                    BEGIN
                        INSERT INTO global_variables (variable_name, variable_value, category)
                        VALUES (@name, @value, @category)
                    END
                `);
        }

        const result = await pool.request().query('SELECT * FROM global_variables ORDER BY variable_name ASC');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.upsertVariable = async (req, res) => {
    try {
        const { variable_name, variable_value, category } = req.body;
        const pool = await poolPromise;
        await ensureTableExists(pool);

        await pool.request()
            .input('name', variable_name)
            .input('value', variable_value)
            .input('category', category || 'General')
            .query(`
                IF EXISTS (SELECT 1 FROM global_variables WHERE variable_name = @name)
                BEGIN
                    UPDATE global_variables 
                    SET variable_value = @value, category = @category, updated_at = GETDATE()
                    WHERE variable_name = @name
                END
                ELSE
                BEGIN
                    INSERT INTO global_variables (variable_name, variable_value, category)
                    VALUES (@name, @value, @category)
                END
            `);
        res.json({ success: true, message: 'Variable saved successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateVariable = async (req, res) => {
    try {
        const { id } = req.params;
        const { variable_name, variable_value, category } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .input('name', variable_name)
            .input('value', variable_value)
            .input('category', category || 'General')
            .query('UPDATE global_variables SET variable_name = @name, variable_value = @value, category = @category, updated_at = GETDATE() WHERE variable_id = @id');
        res.json({ success: true, message: 'Variable updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteVariable = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request()
            .input('id', id)
            .query('DELETE FROM global_variables WHERE variable_id = @id');
        res.json({ success: true, message: 'Variable deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
