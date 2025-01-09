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

            console.log('session ID:', req.body.sessionId)
            try{

                const sessionId = new ObjectId(req.body.sessionId)
                console.log('looking for session:', sessionId)

                const session = await db.collection('sessions').findOne({
                    _id: sessionId
                });

                console.log('session found:', session)

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


        app.listen(process.env.port || 3000, () => console.log('the server is running'))
    })
    .catch(err => console.error('Mongo connection error: ', err))