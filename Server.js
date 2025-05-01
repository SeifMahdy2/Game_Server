const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require("./Database");
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
        res.json({ id: this.lastID, username, email });
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
    
    const sql = `SELECT id, username, email, score FROM users WHERE username = ? AND password = ?`;
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
        
        console.log('Login successful for user:', username, '(ID:', row.id, ')');
        res.json({ 
            success: true,
            user: row
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

// Root route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Game server is running!' });
});

    // Start server
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    