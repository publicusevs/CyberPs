CYBERPS INSTALLATION GUIDE
===========================

REQUIREMENTS BEFORE INSTALLATION:
-----------------------------------
1. Microsoft SQL Server (Express or higher) must be installed and running
2. Windows 10 or Windows 11 (64-bit)
3. No other software required - everything is bundled!

AFTER INSTALLATION:
-------------------
1. The installer will open the .env configuration file
2. Fill in your SQL Server connection details:
   - DB_SERVER=YOUR_SERVER_NAME or localhost\SQLEXPRESS
   - DB_NAME=cyberps_db (or your preferred DB name)
   - DB_USER=sa (or your SQL Server username)
   - DB_PASSWORD=your_password
   - JWT_SECRET=any_long_random_string_here

3. Save the .env file and close Notepad

4. Double-click "CyberPS Investigation Hunter" on your Desktop
   (or from Start Menu)

5. The system will:
   - Auto-create the database tables on first run
   - Launch the web interface at http://localhost:5174

DEFAULT LOGIN:
--------------
   Username: admin
   Password: admin123
   (Change immediately after first login!)

SUPPORT:
--------
   Contact: Cyber Police Station, Jaipur Commissionerate
