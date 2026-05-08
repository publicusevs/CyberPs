-- Investigation Hunter - Database Schema (MSSQL)

-- 1. Users Table
CREATE TABLE users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    mobile NVARCHAR(15) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) CHECK (role IN ('Admin', 'IO', 'Data Entry')),
    is_active BIT DEFAULT 1,
    is_locked BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

-- 2. Login Sessions Table
CREATE TABLE login_sessions (
    session_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    token NVARCHAR(MAX),
    refresh_token NVARCHAR(MAX),
    ip_address NVARCHAR(45),
    device_info NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME
);

-- 3. Cases Table
CREATE TABLE cases (
    case_id INT PRIMARY KEY IDENTITY(1,1),
    fir_no NVARCHAR(50) UNIQUE,
    ackn_no NVARCHAR(50) UNIQUE,
    fraud_amount DECIMAL(18, 2) DEFAULT 0.00,
    description NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Pending', 'Closed')),
    created_by INT FOREIGN KEY REFERENCES users(user_id),
    assigned_to INT FOREIGN KEY REFERENCES users(user_id),
    whatsapp_no NVARCHAR(50),
    gmail_id NVARCHAR(100),
    facebook_id NVARCHAR(100),
    twitter_id NVARCHAR(100),
    linkedin_id NVARCHAR(100),
    insta_id NVARCHAR(100),
    telegram_id NVARCHAR(100),
    website_url NVARCHAR(255),
    other_social NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

-- 4. Case Victims Table
CREATE TABLE case_victims (
    victim_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    name NVARCHAR(100),
    mobile NVARCHAR(15),
    email NVARCHAR(100),
    address NVARCHAR(MAX),
    bank_name NVARCHAR(100),
    account_no NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE()
);

-- 4.5. Case Accused/Suspect Table 
CREATE TABLE case_accused (
    accused_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    name NVARCHAR(100),
    alias NVARCHAR(100),
    mobile NVARCHAR(50),
    whatsapp_no NVARCHAR(50),
    gmail_id NVARCHAR(100),
    facebook_id NVARCHAR(100),
    twitter_id NVARCHAR(100),
    linkedin_id NVARCHAR(100),
    insta_id NVARCHAR(100),
    telegram_id NVARCHAR(100),
    website_url NVARCHAR(255),
    other_social NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

-- 5. FIR Documents Table
CREATE TABLE fir_documents (
    doc_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    file_path NVARCHAR(500),
    file_name NVARCHAR(255),
    file_type NVARCHAR(50),
    uploaded_at DATETIME DEFAULT GETDATE()
);

-- 6. Case Transactions Table
CREATE TABLE case_transactions (
    trans_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    sender_acc NVARCHAR(50),
    receiver_acc NVARCHAR(50),
    amount DECIMAL(18, 2),
    utr_no NVARCHAR(100),
    trans_date DATETIME,
    platform NVARCHAR(50),
    status NVARCHAR(20) DEFAULT 'Reported',
    created_at DATETIME DEFAULT GETDATE()
);

-- 7. Case Notes Table
CREATE TABLE case_notes (
    note_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    note_text NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);

-- 8. Case Status History Table
CREATE TABLE case_status_history (
    history_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    old_status NVARCHAR(20),
    new_status NVARCHAR(20),
    updated_by INT FOREIGN KEY REFERENCES users(user_id),
    reason NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);

-- 9. Case IO History Table
CREATE TABLE case_io_history (
    io_history_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    old_io_id INT FOREIGN KEY REFERENCES users(user_id),
    new_io_id INT FOREIGN KEY REFERENCES users(user_id),
    updated_by INT FOREIGN KEY REFERENCES users(user_id),
    created_at DATETIME DEFAULT GETDATE()
);

-- 10. Case Evidence Table
CREATE TABLE case_evidence (
    evidence_id INT PRIMARY KEY IDENTITY(1,1),
    case_id INT FOREIGN KEY REFERENCES cases(case_id) ON DELETE CASCADE,
    file_path NVARCHAR(500),
    file_name NVARCHAR(255),
    description NVARCHAR(MAX),
    uploaded_at DATETIME DEFAULT GETDATE()
);

-- Default Admin User (Password: admin123)
-- bcrypt hash for 'admin123' is $2b$10$EpjXJmH.r1z3gB.3E5O5Oe8vU.P8L.x5F1Rj8uE5O5Oe8vU.P8L.x5F
-- (Note: In production, never hardcode hashes, but for local setup we need one)
INSERT INTO users (name, username, email, mobile, password_hash, role, is_active)
VALUES ('System Admin', 'admin', 'admin@investigationhunter.com', '9999999999', '$2b$10$Ao8BcLS6xnW12BE0hqaQ0OwMeAZVprvSTBXSHz/qL3FpDoivHD/9i', 'Admin', 1);
USE db_ab6f95_cyberweb;

-- =========================
-- 1. CREATE TABLES (FIRST TIME ONLY)
-- =========================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='police_stations' AND xtype='U')
BEGIN
    CREATE TABLE police_stations (
        police_station_id INT PRIMARY KEY IDENTITY(1,1),
        station_name NVARCHAR(150),
        station_code NVARCHAR(50) UNIQUE,
        state NVARCHAR(100),
        district NVARCHAR(100),
        city NVARCHAR(100),
        address NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_station_mapping' AND xtype='U')
BEGIN
    CREATE TABLE user_station_mapping (
        id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT,
        police_station_id INT,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (police_station_id) REFERENCES police_stations(police_station_id)
    );
END;

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='case_station_mapping' AND xtype='U')
BEGIN
    CREATE TABLE case_station_mapping (
        id INT PRIMARY KEY IDENTITY(1,1),
        case_id INT,
        police_station_id INT,
        FOREIGN KEY (case_id) REFERENCES cases(case_id),
        FOREIGN KEY (police_station_id) REFERENCES police_stations(police_station_id)
    );
END;

-- =========================
-- 2. INSERT POLICE STATION
-- =========================
IF NOT EXISTS (
    SELECT 1 FROM police_stations WHERE station_code = 'CYB-JPR-COM-01'
)
BEGIN
    INSERT INTO police_stations 
    (station_name, station_code, state, district, city, address)
    VALUES
    (
        'Investigation Hunter PS Commissionerate Jaipur',
        'CYB-JPR-COM-01',
        'Rajasthan',
        'Jaipur',
        'Jaipur',
        'Cyber Crime Police Station Jaipur'
    );
END;

-- =========================
-- 3. INSERT USER
-- =========================
IF NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'ccpsjaipurcomminsrate'
)
BEGIN
    INSERT INTO users 
    (name, username, email, mobile, password_hash, role, is_active)
    VALUES
    (
        'Investigation Hunter PS Jaipur Commissionerate',
        'ccpsjaipurcomminsrate',
        'admin@investigationhunter.in',
        '9000000000',
        '$2b$10$Ao8BcLS6xnW12BE0hqaQ0OwMeAZVprvSTBXSHz/qL3FpDoivHD/9i',
        'Admin',
        1
    );
END;

-- =========================
-- 4. DECLARE VARIABLES
-- =========================
DECLARE @ps_id INT;
DECLARE @user_id INT;

SELECT @ps_id = police_station_id 
FROM police_stations 
WHERE station_code = 'CYB-JPR-COM-01';

SELECT @user_id = user_id 
FROM users 
WHERE username = 'ccpsjaipurcomminsrate';

-- =========================
-- 5. USER → STATION MAP
-- =========================
IF NOT EXISTS (
    SELECT 1 FROM user_station_mapping WHERE user_id = @user_id
)
BEGIN
    INSERT INTO user_station_mapping (user_id, police_station_id)
    VALUES (@user_id, @ps_id);
END;

-- =========================
-- 6. CASE → STATION MAP
-- =========================
INSERT INTO case_station_mapping (case_id, police_station_id)
SELECT case_id, @ps_id
FROM cases
WHERE case_id NOT IN (
    SELECT case_id FROM case_station_mapping
);

-- =========================
-- 7. VERIFY
-- =========================
SELECT * FROM police_stations;

SELECT 
    u.username,
    ps.station_name
FROM users u
JOIN user_station_mapping usm ON u.user_id = usm.user_id
JOIN police_stations ps ON ps.police_station_id = usm.police_station_id
WHERE u.username = 'ccpsjaipurcomminsrate';
