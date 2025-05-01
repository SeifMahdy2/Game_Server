const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./Database');
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
    
    const sql = `INSERT INTO users (username, email, password, levels_completed) VALUES (?, ?, ?, 0)`;
    db.run(sql, [username, email, password], function (err) {
        if (err) {
            console.error('Register error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.json({ id: this.lastID, username, email, levels_completed: 0 });
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
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        if (!row) {
            console.log('Login failed: Invalid credentials for username:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const levelData = {
            level1: true, // Level 1 is always unlocked
            level2: row.levels_completed >= 1 // Level 2 is unlocked if level 1 is completed
        };
        
        console.log('Login successful for user:', username, '(ID:', row.id, ')');
        res.json({ 
            success: true,
            user: {
                ...row,
                levels: levelData
            }
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
        
        const levelData = {
            level1: true, // Level 1 is always unlocked
            level2: row.levels_completed >= 1 // Level 2 is unlocked if level 1 is completed
        };
        
        res.json({
            ...row,
            levels: levelData
        });
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
        
        const usersWithLevels = rows.map(user => ({
            ...user,
            levels: {
                level1: true,
                level2: user.levels_completed >= 1
            }
        }));
        
        res.json({ users: usersWithLevels });
    });
});

// 3. Update levels completed
app.put('/update-levels-completed', (req, res) => {
    console.log('Update levels completed request:', req.body);
    const { id, levels_completed } = req.body;
    const sql = `UPDATE users SET levels_completed = ? WHERE id = ?`;
    db.run(sql, [levels_completed, id], function (err) {
        if (err) {
            console.error('Update levels completed error:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        // Calculate unlocked levels
        const levelData = {
            level1: true,
            level2: levels_completed >= 1
        };
        
        res.json({ 
            message: 'Levels completed updated successfully',
            levels: levelData
        });
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

// Update progress endpoint
app.post('/update-progress', (req, res) => {
  const { username, level1, level2 } = req.body;
  
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }
  
  // Convert boolean to integer (SQLite doesn't have boolean type)
  const level1Value = level1 ? 1 : 0;
  const level2Value = level2 ? 1 : 0;
  
  // Update or insert progress
  db.run(`INSERT INTO progress (username, level1, level2) 
          VALUES (?, ?, ?) 
          ON CONFLICT(username) 
          DO UPDATE SET level1 = ?, level2 = ?`, 
    [username, level1Value, level2Value, level1Value, level2Value], function(err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    res.json({ success: true, message: 'Progress updated successfully' });
  });
});

// Get progress endpoint
app.get('/progress/:username', (req, res) => {
  const username = req.params.username;
  
  db.get('SELECT * FROM progress WHERE username = ?', [username], (err, progress) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }
    
    res.json({ 
      success: true, 
      progress: { 
        level1: progress.level1 === 1, 
        level2: progress.level2 === 1 
      } 
    });
  });
});

// Update levels completed by username
app.put('/update-levels-completed-by-username', (req, res) => {
    console.log('Update levels completed by username request:', req.body);
    const { username, levels_completed } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    // First find the user by username
    const findUserSql = `SELECT id FROM users WHERE username = ?`;
    db.get(findUserSql, [username], (err, user) => {
        if (err) {
            console.error('Error finding user:', err.message);
            return res.status(400).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Now update the levels_completed with the found ID
        const updateSql = `UPDATE users SET levels_completed = ? WHERE id = ?`;
        db.run(updateSql, [levels_completed, user.id], function (err) {
            if (err) {
                console.error('Update levels completed error:', err.message);
                return res.status(400).json({ error: err.message });
            }
            
            // Calculate unlocked levels
            const levelData = {
                level1: true,
                level2: levels_completed >= 1
            };
            
            res.json({ 
                message: 'Levels completed updated successfully',
                levels: levelData
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
    