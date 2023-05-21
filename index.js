const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken")
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pr3rbd0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


//function for jwt token verify 
const verifyJWT = (req,res,next) => {
// req.header এর মাধ্যমে টোকেন টা পাবো 
  const authorization = req.headers.authorization;
  
  if(!authorization){  // যদি টোকেন না পাওয়া যায় তবে error  মেসেজ সেন্ড করা হবে 
    res.status(401).send({error:true,message:"unauthorized access"});
  }
  // শুধু টোকেন টা আলাদা করার জন্য  স্প্লিট করা হচ্ছে 
  const token = authorization.split(" ")[1];
  // jwt এর বিল্ড ইন ভ্যারিফাই দিয়ে চেক করা হচ্ছে 
  jwt.verify(token,process.env.ACCESSS_TOKEN_SECRET,(error,decoded) => {
    // যদি ভ্যারিফাই error হয় তবে এই মেসেজ সেন্ড করবো
    if(error){
      return res.status(401).send({error: true, message: "unauthorized access"})
    }
    // আর যদি ভ্যারিফাই হয়ে req object এর মদ্ধ্যে decoded নামে একটা কাস্টম প্রোপার্টি সেট করে দিবো 
    req.decoded = decoded;
    // তার পর next কে কল দিয় সেই রাউটে পাঠিয়ে দিতে হবে 
    next()
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("booking");



    // jwt token collection
    app.post("/jwt",(req,res) => {
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESSS_TOKEN_SECRET,{
        expiresIn: "1h"
      })
      res.send({token});
    })


    // service collection
    app.get("/services", async (req, res) => {
      // const query = {};

      //100 টাকার নিচের গুলা দাও 
      // const query = {price: {$lt:100}}

      //100 টাকার বড় গুলা দাও 
      // const query = {price: {$gt:100}}

      //20 টাকার সমান সমান গুলা দাও 
      // const query = {price: {$eq:20}}


      //50 থেকে ২০০ টাকার  যেই price গুলো আছে সেগুলো দাও 
      // const query = {price: {$in:[50,200]}}

      //50 থেকে ২০০ টাকার  যেই price গুলো নাই সেগুলো দাও 
        // const query = {price: {$in:[50,200]}}

        //50 এর সমান নয় যেগুলো সেই গুলো কে দাও 
        // const query = {price: {$ne:50}}


      const sort = req.query.sort;
      const search = req.query.search;
      const query = {title: {$regex: search, $options:'i'}}

      console.log(search);
//       { sort: 'ase' }
// { sort: 'ase' }
      const options = {
        // sort matched documents in descending order by rating
        sort: { "price": `${sort === 'ase' ? 1 : -1}` },
        // Include only the `title` and `imdb` fields in the returned document
      };
  
      const cursor = serviceCollection.find(query,options);
      const result = await cursor.toArray();
      res.send(result);
    });

   
    
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });


    // booking route 
    app.get("/bookings", verifyJWT, async (req, res) => {
      //decoded নামে সেট করা প্রোপার্টি টা req.decoded থেকে পাবো 
      const decoded = req.decoded
      // decoded.email এবং req.query.email থেকে পাওয়া ইমেল যদি না মিলে তবে পাঠিয়ে দিবো 
      if(decoded.email !== req.query.email ){
        return res.status(404).send({error:1,message:'forbidden access'})
      }
      let query = {};

      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });


    //booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });


    app.patch("/bookings/:id", async (req,res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter = {_id : new ObjectId(id)};
    
      const updateDoc = {
        $set: {
          status:updatedBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});

app.listen(port, () => {
  console.log(`car server is running on port ${port}`);
});
