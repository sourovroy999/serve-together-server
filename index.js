const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt=require('jsonwebtoken')


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()

const port=process.env.PORT || 8000

const app=express() 


const corsOptions={
    origin:[
       'http://localhost:5173',
        'http://localhost:5174',
        'https://serve-together-auth.web.app',

    ],
    credentials: true,
    optionSuccessStatus:200,
}

//middlewire

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

//verifytoken middleware

const verifytoken=(req,res,next)=>{
    const token=req.cookies?.token
    if(!token) return res.status(401).send({message: 'Unauthorized Access'})

        if(token){
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
                if(err){
                    console.log(err);
                    return res.status(401).send({message:"Unauthorized Access"})
                }
                console.log(decoded);
                req.user=decoded

                next()
                
            })
        }
}


// const uri="mongodb://localhost:27017"

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.iy6spfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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

        // jwt generate
        app.post('/jwt', async(req,res)=>{
            const email=req.body
            const token=jwt.sign(email, process.env.ACCESS_TOKEN_SECRET,{
                expiresIn:'7d'
            })

            res
            .cookie('token', token,{
                httpOnly:true,
                secure:process.env.NODE_ENV === 'production',
                sameSite:process.env.NODE_ENV === 'production'? 'none' : 'strict'
            })
            .send({success: true})
        })

        //clear token after log out
        app.get('/logout', (req,res)=>{
            res
            .clearCookie('token', {
                httpOnly:true,
                secure:process.env.NODE_ENV ==='production',
                sameSite:process.env.NODE_ENV=== 'production' ? 'none' : 'strict',
                maxAge:0,
            })
            .send({success: true})
        })

        //create organizations data
        app.post('/organizations', async(req,res)=>{
            const organizersData=req.body 

            if(organizersData.volunteernumber){
                organizersData.volunteernumber=Number(organizersData.volunteernumber);
            }

            const result=await organizersCollection.insertOne(organizersData)
            res.send(result)
        })

        

        //read all posts by organizers
        app.get('/organizationsPosts', async(req,res)=>{
            const search=req.query.search || '';

            const query=search ? {title:{$regex: search, $options:'i'}} : {};

            // let query={
            //     title:{$regex:search, $options:'i'}
            // }



            const result=await organizersCollection.find(query).toArray()
            res.send(result)
        })

        //read 6 posts for home page
        app.get('/urgentPosts', async(req,res)=>{
            // const result=await organizersCollection.find().limit(6).toArray()

            // res.send(result)

            try {
                const result=await organizersCollection.aggregate([
                    {
                        $addFields:{
                            parsedDeadline:{
                                $dateFromString:{
                                     dateString: "$deadline", // the string field in MM/DD/YYYY
                                     format: "%m/%d/%Y"
                                }
                            }
                        }
                    },
                    {
                        $sort:{parsedDeadline:1}
                    },
                    {
                        $limit:6
                    }
                ]).toArray()

                res.send(result)
                
            } catch (error) {
                 console.error("Error fetching urgent posts:", error);
    res.status(500).send({ error: "Failed to fetch urgent posts" });
                
            }

            
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
        app.put('/update-post/:id', verifytoken,  async(req,res)=>{
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


        //delete a post
        app.delete('/delete-post/:id', async(req,res)=>{
            const id=req.params.id
            const query={_id : new ObjectId(id)}
            const result=await organizersCollection.deleteOne(query)
            res.send(result)
            
        })



        //for volunteersss
        app.get('/volunteersall', async(req,res)=>{
            
            const result=await volunteersCollection.find().toArray();
            res.send(result)
        })

        //request to be a  volunteer

        app.post('/volunteers', async(req,res)=>{
            const volunteersData=req.body
            // console.log(volunteersData);
            


            try{
                const result=await volunteersCollection.insertOne(volunteersData)
            
                  const postId = String(volunteersData.postId); // Just i
                  console.log(postId);
                  console.log(typeof(postId));
                  
                  
                 const volunteercount=await organizersCollection.updateOne(
                {_id: new ObjectId(String(postId)), volunteernumber:{$gt:0} },
                {$inc: {volunteernumber: -1}}
            );
            if (volunteercount.modifiedCount === 0) {
  console.log("Nothing updated. Check if volunteernumber is already 0 or not a number.");
}
            console.log(volunteercount);
            

            res.send({
                volunteerInsertResult: result,
                volunteerCountUpdate: volunteercount,
                
            });

            }

            catch(err){
                console.log(err);
                 res.status(500).send({ error: 'Something went wrong' });
                
            }


        })



        app.get('/volunteer/:email',verifytoken, async(req,res)=>{
            const email=req.params.email;
            const query={Volunteer_Email:email}
            const result=await volunteersCollection.find(query).toArray()
            res.send(result)
            
        })

        app.delete('/volunteerdelete/:id', verifytoken, async(req,res)=>{
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