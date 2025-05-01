const sqlite3 = require('sqlite3').verbose();
// Connect to SQLite database
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
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
        
        // Migration: Rename 'score' column to 'levels_completed' if it exists
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (err) {
                console.error('Error checking table schema:', err.message);
                return;
            }
            
            // Check if the score column exists
            const hasScoreColumn = rows && Array.isArray(rows) && rows.some(row => row.name === 'score');
            
            if (hasScoreColumn) {
                console.log('Migrating database: Renaming score to levels_completed');
                
                // SQLite doesn't support direct column renaming, so we need to recreate the table
                db.serialize(() => {
                    // Create temporary table
                    db.run(`
                        CREATE TABLE users_temp (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username TEXT UNIQUE NOT NULL,
                            email TEXT UNIQUE NOT NULL,
                            password TEXT,
                            levels_completed INTEGER DEFAULT 0
                        )
                    `);
                    
                    // Copy data, converting score to levels_completed
                    db.run(`
                        INSERT INTO users_temp (id, username, email, password, levels_completed)
                        SELECT id, username, email, password, score FROM users
                    `);
                    
                    // Drop old table
                    db.run('DROP TABLE users');
                    
                    // Rename new table
                    db.run('ALTER TABLE users_temp RENAME TO users');
                    
                    console.log('Database migration completed successfully');
                });
            }
        });
        
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