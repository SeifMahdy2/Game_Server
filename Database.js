const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.NODE_ENV === 'production'
    ? '/tmp/users.db'
    :  'users.db'; 

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        
        // Create users table if not exists with password column included
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                levels_completed INTEGER DEFAULT 0
            )
        `);
        
        // Create progress table if not exists
        db.run(`
            CREATE TABLE IF NOT EXISTS progress (
                username TEXT PRIMARY KEY,
                level1 INTEGER DEFAULT 0,
                level2 INTEGER DEFAULT 0
            )
        `);
    }
});

module.exports = db; 