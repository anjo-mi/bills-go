require('dotenv').config();

const MongoURL = process.env.MongoURL;

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));


class Session{
    constructor(userID, username){
        this.userID = userID;
        this.username = username;
        this.createAt = new Date();
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
}


let db

MongoClient.connect(MongoURL)
    .then(client => {
        db = client.db('bills-go');

        // sign up - if not already existing, add user to collection, create session for the user and redirect
        app.post('/auth/signup', async (req,res) => {
            try{

                const existingUser = await db.collection('users').findOne({
                    username: req.body.username
                });

        
                if (existingUser) {
                    return res.status(409).json({ error: 'Username already exists' });
                }

                const result = await db.collection('users').insertOne({
                    username: req.body.username,
                    password: req.body.password,
                    boards: []
                })

                const session = new Session(result.insertedId, req.body.username);
                await db.collection('sessions').insertOne(session);
                res.json({
                    success: true,
                    sessionId: session._id,
                    username: session.username,
                    expiresAt: session.expiresAt
                });
            }catch(error){
                res.status(500).json({error: 'server error'})
            }
        })

        // login - verify user exists, create new session for the user
        app.post('/auth/login', async (req,res) => {
            try {
                const user = await db.collection('users').findOne({
                    username: req.body.username,
                    password: req.body.password
                });

                if (user){
                    const session = new Session(user._id, user.username);
                    await db.collection('sessions').insertOne(session);
                    res.json({
                        success: true,
                        sessionId: session._id,
                        username: session.username,
                        isAdmin: user.isAdmin,
                        expiresAt: session.expiresAt
                    });
                }else{
                    res.status(401).json({error: 'Invalid credentials'})
                }
            }catch(error){
                res.status(500).json({error: 'server error'})
            }
        })

        app.post('/submit-board', async (req,res) => {

            try{

                const sessionId = new ObjectId(req.body.sessionId)

                const session = await db.collection('sessions').findOne({
                    _id: sessionId
                });


                if (!session || session.expiresAt < new Date()){
                    return res.status(401).json({error: 'log in ya bozo'})
                }

                await db.collection('users').updateOne(
                    {username: req.body.username},
                    {$push: {boards: req.body.grid}}
                )

                res.json({success: true})

            } catch(error){
                console.error('server error: ', error)
                res.status(500).json({error: 'server error'});
            }
        })

        app.get('/all-boards', async (req,res) => {
            try {
                const allBoards = [];
                const users = await db.collection('users').find().toArray();
                users.forEach(user => {
                    user.boards.forEach((board, index) => {
                        allBoards.push({
                            username: user.username,
                            boardNumber: index + 1,
                            grid: Array.isArray(board) ? board : board.grid,
                            isVerified: board.isVerified || false
                        });
                    });
                });
                res.json(allBoards);
            } catch(err) {
                console.error('error getting all boards: ', err);
                res.status(500).json({error: 'server error'});
            }
        });

        app.get('/user-boards', async (req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });


                if (!session || session.expiresAt < new Date()){
                    return res.status(401).json({error: 'session expired'});
                }

                const user = await db.collection('users').findOne({
                    username: req.headers.username
                })

               

                if (!user){
                    return res.status(404).json({error: 'user not found'})
                }
                const boards = user.boards || [];
                
                res.json({boards: boards});
            }catch(err){
                console.error('server error:', err);
                res.status(500).json({error: 'server error'});
            }
        })

        app.post('/create-admin', async (req, res) => {
            try {
                // Check if any admin already exists
                const existingAdmin = await db.collection('users').findOne({ isAdmin: true });
                if (existingAdmin) {
                    return res.status(403).json({ error: 'Admin already exists' });
                }
        
                // Create the admin user
                const adminUser = {
                    username: req.body.username,
                    password: req.body.password,
                    isAdmin: true,
                    boards: []
                };
        
                await db.collection('users').insertOne(adminUser);
                res.json({ success: true });
        
            } catch (error) {
                console.error('Server error:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.get('/admin/conditions', async (req, res) => {
            try {
                const users = await db.collection('users').find().toArray();
                const conditionsMap = new Map();
        
                users.forEach(user => {
                    user.boards.forEach(board => {
                        // Check if board is an object with a grid property
                        const grid = Array.isArray(board) ? board : board.grid;
                        if (Array.isArray(grid)) {
                            grid.forEach(row => {
                                row.forEach(cell => {
                                    if (cell && cell.description) {
                                        if (!conditionsMap.has(cell.description) || 
                                            conditionsMap.get(cell.description).status === undefined) {
                                            conditionsMap.set(cell.description, {
                                                description: cell.description,
                                                status: cell.status
                                            });
                                        }
                                    }
                                });
                            });
                        }
                    });
                });
        
                res.json(Array.from(conditionsMap.values()));
            } catch (error) {
                console.error('Error getting conditions:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.put('/admin/conditions', async (req,res) => {
            try {
                const { description, status } = req.body
        
                const users = await db.collection('users').find().toArray()
                for (const user of users) {
                    console.log('user board: ', user.boards)
                    const updatedBoards = user.boards.map(board => {
                        // If board is an array, it's unverified - map directly
                        if (Array.isArray(board)) {
                            return board.map(row => 
                                row.map(cell => {
                                    if (cell && cell.description === description) {
                                        return {...cell, status}
                                    }
                                    return cell
                                })
                            )
                        } 
                        // If board is an object with grid property, it's verified - map the grid
                        else {
                            return {
                                ...board,
                                grid: board.grid.map(row =>
                                    row.map(cell => {
                                        if (cell && cell.description === description) {
                                            return {...cell, status}
                                        }
                                        return cell
                                    })
                                )
                            }
                        }
                    })
                    
                    await db.collection('users').updateOne(
                        {_id: user._id},
                        {$set: {boards: updatedBoards}}
                    )
                }
        
                res.json({success: true})
            } catch(err) {
                console.error('error updating conditions: ', err)
                res.status(500).json({error: 'server error'});
            }
        })

        app.get('/admin/unverified-boards', async (req, res) => {
            try {
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });
        
                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });
        
                if (!session || !adminUser) {
                    return res.status(401).json({ error: 'unauthorized' });
                }
        
                // Get all users and their boards
                const users = await db.collection('users').find().toArray();
                const unverifiedBoards = [];
        
                users.forEach(user => {
                    user.boards.forEach((board, index) => {
                        if (!board.isVerified) {
                            unverifiedBoards.push({
                                userId: user._id.toString(), // Convert ObjectId to string
                                username: user.username,
                                boardIndex: index,
                                boardNumber: index + 1,
                                board: board
                            });
                        }
                    });
                });
        
                res.json(unverifiedBoards);
            } catch (error) {
                console.error('Error getting unverified boards:', error);
                res.status(500).json({ error: 'Server error' });
            }
        });

        app.put('/admin/boards/:userId/:boardIndex/verify', async (req, res) => {
            try {
                // Verify admin session
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });
        
                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });
        
                if (!session || !adminUser) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
        
                // Get the user first
                const user = await db.collection('users').findOne({
                    _id: new ObjectId(req.params.userId)
                });
        
                if (!user || !user.boards) {
                    return res.status(404).json({ error: 'User or boards not found' });
                }
        
                // Convert boardIndex to number and verify it's valid
                const boardIndex = parseInt(req.params.boardIndex);
                if (boardIndex < 0 || boardIndex >= user.boards.length) {
                    return res.status(400).json({ error: 'Invalid board index' });
                }
        
                // Add isVerified property to the board array
                const updatedBoard = user.boards[boardIndex];
                if (Array.isArray(updatedBoard)) {
                    // If the board is a direct array, wrap it in an object
                    user.boards[boardIndex] = {
                        grid: updatedBoard,
                        isVerified: true
                    };
                } else {
                    // If it's already an object, just add the isVerified property
                    user.boards[boardIndex].isVerified = true;
                }
        
                // Update the entire boards array
                await db.collection('users').updateOne(
                    { _id: new ObjectId(req.params.userId) },
                    { $set: { boards: user.boards } }
                );
        
                res.json({ success: true });
        
            } catch (error) {
                console.error('Error verifying board:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/admin/users', async (req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });


                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });


                if (!session || !adminUser){
                    return res.status(401).json({error: 'unauthorized'});
                }

                const users = await db.collection('users').find().toArray();

                const userList = users.map(user => ({
                    _id: user._id,
                    username: user.username,
                    isAdmin: user.isAdmin,
                    boardCount: user.boards ? user.boards.length : 0
                }));

                res.json(userList)
            }catch(err){
                console.error('error getting users: ', err)
                res.status(500).json({error: 'server error'});
            }
        })

        app.delete('/admin/users/:userId', async(req,res) => {
            try {
                
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });
        
                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });
        
                if (!session || !adminUser) {
                    return res.status(401).json({error: 'do your hacking elsewhere please'});
                }
        
                const userToDelete = await db.collection('users').findOne({
                    _id: new ObjectId(req.params.userId)
                });
        
                if (!userToDelete) {
                    return res.status(404).json({error: 'user not found'});
                }
        
                if (userToDelete.isAdmin) {
                    return res.status(403).json({error: 'cannot delete admin'});
                }
        
                const result = await db.collection('users').deleteOne({
                    _id: new ObjectId(req.params.userId)
                });
                
                res.json({ success: true }); // Add this line - we were missing a response for success case
        
            } catch(err) {
                console.error('error deleting user: ', err);
                res.status(500).json({error: 'server error'});
            }
        });

        app.listen(process.env.PORT || 3000, () => console.log('the server is running'))
    })
    .catch(err => console.error('Mongo connection error: ', err))