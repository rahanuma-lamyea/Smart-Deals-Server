const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

initializeApp({
    credential: cert(serviceAccount)
});


app.use(cors());
app.use(express.json());
require('dotenv').config();


const logger = (req, res, next) => {
    console.log('Contact Info')
    next();
}

const verifyFBToken = async (req, res, next) => {
    console.log('In the verify MiddleWare', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        console.log('After token validation', decodedToken);
        req.user = decodedToken;
        req.token_email = decodedToken.email;
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).send({ message: 'unauthorized access' });
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.um9oqlr.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send("Server is running..");
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB!");

        const db = client.db('smart_deals_db');
        const productsCollection = db.collection('products');
        const bidsCollection = db.collection('bids');

        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });
        app.post('/getToken', (req, res) => {
            const token = jwt.sign({ email: 'abc' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })
        app.get('/bids', logger, verifyFBToken, async (req, res) => {
            console.log('headers', req.headers);
            const email = req.query.email;
            const query = {};
            if (email) {
                if (email !== req.token_email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }
                query.$or = [
                    { buyer_email: email },
                    { buyerEmail: email }
                ];
            }
            const cursor = bidsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/bids', async (req, res) => {
            const newBid = req.body;
            const result = await bidsCollection.insertOne(newBid);
            res.send(result);
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        });

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedProduct = req.body;
            const update = {
                $set: updatedProduct
            };
            const result = await productsCollection.updateOne(query, update);
            res.send(result);
        });

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.findOne(query);
            res.send(result);
        });

        app.get('/latestProducts', async (req, res) => {
            const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/products/bids/:productId', verifyFBToken, async (req, res) => {
            const productId = req.params.productId;
            const query = {
                $or: [
                    { product: productId },
                    { productId: productId }
                ]
            }
            const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
            const result = await cursor.toArray();
            res.send(result);
        })

        app.patch('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedBid = req.body;
            const update = {
                $set: updatedBid
            };
            const result = await bidsCollection.updateOne(query, update);
            res.send(result);
        });

        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsCollection.deleteOne(query);
            res.send(result);
        });

    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Smart server is running on port: ${port}`);
});