const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require("./database");
const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors()); // Allow Unity to access API
app.use(bodyParser.json()); // Parse JSON requests
app.use(cookieParser());

console.log('Starting server setup...');

// 1. Register a new user
app.post('/register', (req, res) => {
    console.log('Register request received:', req.body);
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.run(sql, [username, email, password], function (err) {
        if (err) {
            console.error('Register error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        // Also create initial progress entry for this user
        const progressSql = `INSERT INTO progress (username, level1, level2) VALUES (?, 0, 0)`;
        db.run(progressSql, [username], function(progressErr) {
            if (progressErr) {
                console.error('Progress creation error:', progressErr.message);
                // Continue anyway as user was created
            }
            
            res.json({ id: this.lastID, username, email });
        });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    console.log('Login request received with body:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Login missing credentials:', { username: !!username, password: !!password });
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const sql = `SELECT id, username, email, levels_completed FROM users WHERE username = ? AND password = ?`;
    console.log('Executing login query for username:', username);
    db.get(sql, [username, password], (err, user) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        if (!user) {
            console.log('Login failed: Invalid credentials for username:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Get user's progress data
        const progressSql = `SELECT level1, level2 FROM progress WHERE username = ?`;
        db.get(progressSql, [username], (progressErr, progress) => {
            if (progressErr) {
                console.error('Progress fetch error:', progressErr.message);
                return res.status(400).json({ error: progressErr.message });
            }
            
            // Convert integer values to booleans for the client
            const levels = {
                level1: progress ? progress.level1 === 1 : false,
                level2: progress ? progress.level2 === 1 : false
            };
            
            console.log('Login successful for user:', username, '(ID:', user.id, ')');
            res.json({ 
                success: true,
                user: {
                    ...user,
                    levels
                }
            });
        });
    });
});

// 2. Get user data
app.get('/user/:id', (req, res) => {
    console.log('Get user request for ID:', req.params.id);
    const sql = `SELECT * FROM users WHERE id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Get user error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.json(row);
    });
});

// Get all users (new endpoint)
app.get('/users', (req, res) => {
    console.log('Get all users request');
    const sql = `SELECT * FROM users`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Get all users error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.json({ users: rows });
    });
});

// 3. Update user score
app.put('/update-score', (req, res) => {
    console.log('Update score request:', req.body);
    const { id, score } = req.body;
    const sql = `UPDATE users SET score = ? WHERE id = ?`;
    db.run(sql, [score, id], function (err) {
        if (err) {
            console.error('Update score error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Score updated successfully' });
    });
});

// 4. Delete user
app.delete('/user/:id', (req, res) => {
    console.log('Delete user request for ID:', req.params.id);
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            console.error('Delete user error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'User deleted' });
    });
});

// 5. Update user progress
app.post('/update-progress', (req, res) => {
    console.log('Update progress request:', req.body);
    const { username, level1, level2 } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    // Convert boolean values to integers for storage
    const level1Value = level1 ? 1 : 0;
    const level2Value = level2 ? 1 : 0;
    
    // Update progress table
    const sql = `INSERT OR REPLACE INTO progress (username, level1, level2) VALUES (?, ?, ?)`;
    db.run(sql, [username, level1Value, level2Value], function (err) {
        if (err) {
            console.error('Update progress error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        // Also update levels_completed in the users table
        const levelsCompleted = level1Value + level2Value;
        const userSql = `UPDATE users SET levels_completed = ? WHERE username = ?`;
        db.run(userSql, [levelsCompleted, username], function (userErr) {
            if (userErr) {
                console.error('Update levels_completed error:', userErr.message);
                // Continue anyway, as progress was updated
            }
            
            res.json({ 
                success: true,
                message: 'Progress updated successfully' 
            });
        });
    });
});

// 6. Get user progress
app.get('/progress/:username', (req, res) => {
    console.log('Get progress request for username:', req.params.username);
    const sql = `SELECT level1, level2 FROM progress WHERE username = ?`;
    db.get(sql, [req.params.username], (err, row) => {
        if (err) {
            console.error('Get progress error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ 
                success: false,
                error: 'No progress found for this user' 
            });
        }
        
        // Convert integer values to booleans for the client
        res.json({ 
            success: true,
            progress: {
                level1: row.level1 === 1,
                level2: row.level2 === 1
            }
        });
    });
});

// Root route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Game server is running!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
    