const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    //   "https://camp-aid.web.app",
    //   "https://camp-aid.firebaseapp.com",    
    ],
    credentials: true,
  })
);
// app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rmgdsvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const addUserCollection = client.db("MediShop").collection("users");
    const addProductsCollection = client.db("MediShop").collection("products");
    const addCardsCollection = client.db("MediShop").collection("cards");



    //jwt related api
    app.post("/jwt", async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });
        res.send({ token });
      });
  
      // middleweares
      const verifyToken = (req, res, next) => {
        console.log("inside verifty token", req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        const token = req.headers.authorization.split(" ")[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            console.log({ err });
            return res.status(401).send({ message: "unauthorized access" });
          }
          req.decoded = decoded;
          next();
        });
      };
  
      // use verify admin after verify token
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await addUserCollection.findOne(query);
        const isAdmin = user?.role === "admin";
        if (!isAdmin) {
          return res.status(403).send({ message: "forbidden access" });
        }
        next();
      };

    // auth related

    app.post("/users", async (req, res) => {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await addUserCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "user already exists", insertId: null });
        }
        const result = await addUserCollection.insertOne(user);
        res.send(result);
      });

    
      app.get("/users/admin/:email", verifyToken, async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const query = { email: email };
        const user = await addUserCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      });
  
      app.get("/users", async (req, res) => {
        try {
          const query = addUserCollection.find();
          const result = await query.toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching users:", error);
          res.status(500).send("Error fetching users");
        }
      });
  
      app.patch(
        "/users/admin/:id",
 
        async (req, res) => {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              role: "admin",
            },
          };
          const result = await addUserCollection.updateOne(filter, updatedDoc);
          res.send(result);
        }
      );
  
      app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await addUserCollection.deleteOne(query);
        res.send(result);
      });
  
       // products

       app.post("/products", verifyToken, async (req, res) => {
        const item = req.body;
        const result = await addProductsCollection.insertOne(item);
        res.send(result);
      });

    app.get("/products", async (req, res) => {
      const result = await addProductsCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addProductsCollection.findOne(query);
      res.send(result);
    });

    // added cards collection

     app.post("/cards", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await addCardsCollection.insertOne(item);
      res.send(result);
    });

      app.get("/cards", async (req, res) => {
        const result = await addCardsCollection.find().toArray();
        res.send(result);
      });

      // Get An User Data
    // app.get("/cards/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const user = await addCardsCollection.find(query).toArray();
    //   res.send(user);
    // });

    app.get('/cards/:email', verifyToken, async(req, res)=>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await addCardsCollection.find(query).toArray()
      res.send(result)
    })

    
// app.get("/cards/:email", async (req, res) => {
//   const email = req.params.email;

//   try {
//     const user = await addCardsCollection.findOne({ email: email });
//     if (user) {
//       res.status(200).send(user);
//     } else {
//       res.status(404).send({ message: "User not found" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ message: "Internal Server Error" });
//   }
// });




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Medicine shop is running");
  });
  
  app.listen(port, () => {
    console.log(`Medicine shop  is on port: ${port}`);
  });
  
