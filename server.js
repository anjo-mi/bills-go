const MongoURL = 'mongodb+srv://nojaimk:N**buf52@cluster0.qbmen.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection URI - you'll replace this with your connection string
const client = new MongoClient(MongoURL);

async function connectToDb() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        return client.db("boardGameDB");
    } catch (err) {
        console.error("Could not connect to MongoDB:", err);
        process.exit(1);
    }
}

// Create new user
app.post('/api/register', async (req, res) => {
    try {
        const db = client.db("boardGameDB");
        const { username, password } = req.body;
        
        // Check if username already exists
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }
        
        // Create new user
        const newUser = {
            username,
            password,
            isAdmin: false,
            boards: []
        };
        
        await db.collection('users').insertOne(newUser);
        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const db = client.db("boardGameDB");
        const { username, password } = req.body;
        
        const user = await db.collection('users').findOne({ username });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        
        res.json({ 
            message: "Login successful",
            isAdmin: user.isAdmin || false,
            userId: user._id
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Create a new board for a user
app.post('/api/boards', async (req, res) => {
    try {
        const db = client.db("boardGameDB");
        const { userId, boardData } = req.body;
        
        // Add default values to the board
        const newBoard = {
            ...boardData,
            isVerified: false,
            conditions: {},  // This will store your true/false conditions
            dateCreated: new Date(),
        };
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $push: { boards: newBoard } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "Board created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all boards for a user
app.get('/api/boards/:userId', async (req, res) => {
    try {
        const db = client.db("boardGameDB");
        const userId = req.params.userId;
        
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { boards: 1 } }
        );
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user.boards || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin route to verify a board
app.patch('/api/admin/verify-board', async (req, res) => {
    try {
        const db = client.db("boardGameDB");
        const { userId, boardIndex, isVerified } = req.body;
        
        // Update the specific board's verification status
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { [`boards.${boardIndex}.isVerified`]: isVerified } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "User or board not found" });
        }
        
        res.json({ message: "Board verification updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
connectToDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});