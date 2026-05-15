-- Run this in SSMS on your database: db_ab6f95_cyberweb
-- Adds layer & ifsc_code columns to case_transactions table

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.case_transactions') AND name = N'layer'
)
BEGIN
    ALTER TABLE dbo.case_transactions ADD layer NVARCHAR(20) NULL;
    PRINT '✓ layer column added';
END
ELSE
    PRINT '⚠ layer column already exists';

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.case_transactions') AND name = N'ifsc_code'
)
BEGIN
    ALTER TABLE dbo.case_transactions ADD ifsc_code NVARCHAR(20) NULL;
    PRINT '✓ ifsc_code column added';
END
ELSE
    PRINT '⚠ ifsc_code column already exists';

-- Verify
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'case_transactions'
ORDER BY ORDINAL_POSITION;
