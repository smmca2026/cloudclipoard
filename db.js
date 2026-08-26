const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbType = 'mysql';
let pool = null;

// Pure JS JSON database for cloud fallback (zero native dependencies, 0 build errors)
const DB_FILE = path.join(__dirname, 'db.json');

function loadJsonDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { users: [], clipboard: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { users: [], clipboard: [] };
    }
}

function saveJsonDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function init() {
    // On cloud (e.g. Render) without DB_HOST specified, use JSON storage immediately
    if (process.env.RENDER && !process.env.DB_HOST) {
        dbType = 'json';
        loadJsonDB();
        console.log('✅ [Database] Running on Render Cloud - Using JSON storage.');
        return;
    }

    // Try MySQL connection
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Digi@2024',
            database: process.env.DB_NAME || 'cloudclipboard',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 2000
        };

        const rootConn = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port,
            connectTimeout: 2000
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConn.end();

        pool = mysql.createPool(dbConfig);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS clipboard (
                id INT AUTO_INCREMENT PRIMARY KEY,
                content LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        dbType = 'mysql';
        console.log('✅ [Database] Connected to MySQL successfully.');
        return;
    } catch (err) {
        console.log('ℹ️ [Database] MySQL not reachable (' + err.message + '). Using JSON storage.');
    }

    dbType = 'json';
    loadJsonDB();
    console.log('✅ [Database] Cloud JSON database initialized successfully.');
}

async function query(sql, params = []) {
    if (dbType === 'mysql' && pool) {
        return await pool.query(sql, params);
    }

    const dbData = loadJsonDB();
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    if (/SELECT \* FROM users WHERE email\s*=\s*\? AND password\s*=\s*\?/i.test(cleanSql)) {
        const email = params[0];
        const password = params[1];
        const rows = dbData.users.filter(u => u.email === email && u.password === password);
        return [rows];
    }

    if (/SELECT \* FROM users WHERE email\s*=\s*\?/i.test(cleanSql)) {
        const email = params[0];
        const rows = dbData.users.filter(u => u.email === email);
        return [rows];
    }

    if (/INSERT INTO users/i.test(cleanSql)) {
        const email = params[0];
        const password = params[1];
        const newUser = { id: dbData.users.length + 1, email, password };
        dbData.users.push(newUser);
        saveJsonDB(dbData);
        return [{ insertId: newUser.id, affectedRows: 1 }];
    }

    if (/UPDATE users SET password/i.test(cleanSql)) {
        const newPassword = params[0];
        const email = params[1];
        let affectedRows = 0;
        dbData.users.forEach(u => {
            if (u.email === email) {
                u.password = newPassword;
                affectedRows++;
            }
        });
        saveJsonDB(dbData);
        return [{ affectedRows }];
    }

    if (/DELETE FROM clipboard WHERE id\s*=\s*\?/i.test(cleanSql)) {
        const id = parseInt(params[0]);
        const prevLen = dbData.clipboard.length;
        dbData.clipboard = dbData.clipboard.filter(c => c.id !== id);
        saveJsonDB(dbData);
        return [{ affectedRows: prevLen - dbData.clipboard.length }];
    }

    if (/DELETE FROM clipboard/i.test(cleanSql)) {
        const count = dbData.clipboard.length;
        dbData.clipboard = [];
        saveJsonDB(dbData);
        return [{ affectedRows: count }];
    }

    if (/INSERT INTO clipboard/i.test(cleanSql)) {
        const content = params[0];
        const nextId = dbData.clipboard.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
        const newEntry = { id: nextId, content, created_at: new Date().toISOString() };
        dbData.clipboard.push(newEntry);
        saveJsonDB(dbData);
        return [{ insertId: newEntry.id, affectedRows: 1 }];
    }

    if (/SELECT \* FROM clipboard ORDER BY id DESC LIMIT 1/i.test(cleanSql)) {
        const rows = dbData.clipboard.length > 0 ? [dbData.clipboard[dbData.clipboard.length - 1]] : [];
        return [rows];
    }

    if (/SELECT \* FROM clipboard ORDER BY id DESC/i.test(cleanSql)) {
        const rows = [...dbData.clipboard].reverse();
        return [rows];
    }

    return [[]];
}

module.exports = {
    init,
    query,
    getDbType: () => dbType
};

