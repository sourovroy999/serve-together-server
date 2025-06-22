const express = require('express');
const cors = require('cors');
// const cookieParser = require('cookieParser');
// const jwt = require('jwt');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()

const port=process.env.PORT || 8000

const app=express()

const corsOptions={
    origin:[
       'http://localhost:5173',
        'http://localhost:5174',
    ],
    credentials: true,
    optionSuccessStatus:200,
}

//middlewire

app.use(cors(corsOptions))
app.use(express.json())
// app.use(cookieParser())


const uri="mongodb://localhost:27017"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


//main function
async function run() {

    try{
        const volunteersCollection=client.db('serveTogether').collection('volunteers')

        const organizersCollection=client.db('serveTogether').collection('organizers')

        //jwt generate
        // app.post('/jwt', async(req,res)=>{
        //     const email=req.body
        //     const token=jwt.sign(email, process.env.ACCESS_TOKEN_SECRET,{
        //         expiresIn:'7d'
        //     })

        //     res
        //     .cookie('token', token,{
        //         httpOnly:true,
        //         secure:process.env.NODE_ENV === 'production',
        //         sameSite:process.env.NODE_ENV === 'production'? 'none' : 'strict'
        //     })
        //     .send({success: true})
        // })

        //create organizations data
        app.post('/organizations', async(req,res)=>{
            const organizersData=req.body 
            const result=await organizersCollection.insertOne(organizersData)
            res.send(result)
        })

        

        //read all posts by organizers
        app.get('/organizationsPosts', async(req,res)=>{
            const result=await organizersCollection.find().toArray()
            res.send(result)
        })

        //read single organizer post
        app.get('/organization/:email', async(req,res)=>{
            const email=req.params.email;
            const query={organizerEmail: email}
            const result=await organizersCollection.find(query).toArray()
            res.send(result)
        })


        //get single post details
        app.get('/post/:id', async(req,res)=>{
            const id=req.params.id
            const query= new ObjectId(id)
            const result=await organizersCollection.findOne(query)
            res.send(result)
        })

        //update a single organization post
        app.put('/update-post/:id', async(req,res)=>{
            const id=req.params.id
            const updatedData=req.body;


            try {
                const result=await organizersCollection.updateOne(
                    {_id: new ObjectId(id)},
                    {$set: updatedData}
                )
                res.send(result)


                
            } catch (error) {
                res.status(500).json({error: 'Something went wrong', details: error})
            }

        })



        //for volunteersss

        app.post('/volunteers', async(req,res)=>{
            const volunteersData=req.body
            const result=await volunteersCollection.insertOne(volunteersData)
            res.send(result)

        })
        app.get('/volunteer/:email', async(req,res)=>{
            const email=req.params.email;
            const query={Volunteer_Email:email}
            const result=await volunteersCollection.find(query).toArray()
            res.send(result)
            
        })

        app.delete('/volunteerdelete/:id', async(req,res)=>{
            const id=req.params.id
            const query={_id:new ObjectId(id)}
            const result=await volunteersCollection.deleteOne(query)
            res.send(result)
        })












  // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");



        
    } finally {

    }
    
}
run().catch(console.dir);






app.get('/', (req,res)=>{
    res.send('hello from ServeTogether server')
})

app.listen(port, ()=>console.log(`server running on port ${port}`)
)