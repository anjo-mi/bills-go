const MongoURL = 'mongodb+srv://nojaimk:N**buf52@cluster0.qbmen.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

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

        app.get('/user-boards', async (req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });

                console.log({session})

                if (!session || session.expiresAt < new Date()){
                    return res.status(401).json({error: 'session expired'});
                }

                const user = await db.collection('users').findOne({
                    username: req.headers.username
                })

                console.log({user})

                if (!user){
                    return res.status(404).json({error: 'user not found'})
                }
                const boards = user.boards || [];
                console.log('sending boards: ', JSON.stringify(boards, null, 2));
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

        app.get('/admin/conditions', async(req,res) => {
            try {
                const users = await db.collection('users').find().toArray();
                const conditionsMap = new Map();

                users.forEach(user => {
                    user.boards.forEach(board => {
                        board.forEach(row => {
                            row.forEach(cell => {
                                if (cell && cell.description){
                                    if (!conditionsMap.has(cell.description) || 
                                        conditionsMap.get(cell.description).status === undefined){
                                            conditionsMap.set(cell.description, {
                                                description: cell.description,
                                                status: cell.status
                                            });
                                        }
                                }
                            });
                        });
                    });
                });
                res.json(Array.from(conditionsMap.values()));
            }catch(err){
                console.error('error getting conditions: ', err);
                res.status(500).json({error: 'server error'});
            }
        })

        app.put('/admin/conditions', async (req,res) => {
            try {
                const { description, status } = req.body

                const users = await db.collection('users').find().toArray()

                for (const user of users){
                    const updatedBoards = user.boards.map(board => 
                        board.map(row => 
                            row.map(cell => {
                                if (cell && cell.description === description){
                                    return {...cell, status}
                                }
                                return cell
                            })
                        )
                    )
                    await db.collection('users').updateOne(
                        {_id: user._id},
                        {$set: {boards: updatedBoards}}
                    )
                }

                res.json({success: true})
            }catch(err){
                console.error('error updating conditions: ', err)
                res.status(500).json({error: 'server error'});
            }
        })

        app.get('/admin/unverified-boards', async(req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });

                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });

                if (!session || !adminUser){
                    return res.status(401).json({error: 'please hack away anywhere but here'});
                }

                const users = await db.collection('users').find().toArray();
                const unverifiedBoards = [];

                users.forEach(user => {
                    user.boards.forEach((board, index) => {
                        if (!board.isVerified){
                            unverifiedBoards.push({
                                userId: user._id,
                                username: user.username,
                                boardIndex: index,
                                board: board
                            });
                        }
                    });
                });

                res.json(unverifiedBoards)
            }catch(err){
                console.error('error getting unverified boards: ', err);
                res.status(500).json({error: 'server error'})
            }
        });

        app.put('/admin/boards/:userId/:boardIndex/verify', async (req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });

                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });

                if (!session || !adminUser){
                    return res.status(401).json({error: 'mutumbo!'});
                }

                await db.collection('users').updateOne(
                    {_id: new ObjectId(req.params.userId)},
                    {
                        $set: {
                            [`boards.${req.params.boardIndex}.isVerified`]: true
                        }
                    }
                );

                res.json({success: true})
            }catch(err){
                console.error('error verifying board: ', err);
                res.status(500).json({error: 'server error'})
            }
        })

        app.get('/admin/users', async (req,res) => {
            try{
                console.log('headers for /admin/users', req.headers)
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });

                console.log('session', session)

                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });

                console.log('admin', adminUser)

                if (!session || !adminUser){
                    return res.status(401).json({error: 'unauthorized'});
                }

                const users = await db.collection('users').find().toArray();

                const userList = users.map(user => ({
                    _id: user._id,
                    username: user.username,
                    isAdmin: user.isAdmin,
                    boardCount: user.boards.length
                }));

                res.json(userList)
            }catch(err){
                console.error('error getting users: ', err)
                res.status(500).json({error: 'server error'});
            }
        })

        app.delete('/admin/users/:userId', async(req,res) => {
            try{
                const session = await db.collection('sessions').findOne({
                    _id: new ObjectId(req.headers.sessionid)
                });

                const adminUser = await db.collection('users').findOne({
                    _id: session.userID,
                    isAdmin: true
                });

                if (!session || !adminUser){
                    return res.status(401).json({error: 'do your hacking elsewhere please'});
                }

                const userToDelete = await db.collection('users').findOne({
                    _id: new ObjectId(req.params.userId)
                });

                if (userToDelete.isAdmin){
                    return res.status(403).json({error: 'cannot delete admin'});
                }

                await db.collection('users').deleteOne({
                    _id: new ObjectId(req.params.userId)
                });

                res.json({success: true})
            }catch(err){
                console.error('error deleting user: ', err);
                res.status(500).json({error: 'server error'});
            }
        });

        app.listen(process.env.port || 3000, () => console.log('the server is running'))
    })
    .catch(err => console.error('Mongo connection error: ', err))