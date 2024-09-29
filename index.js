const express = require('express')
require('dotenv').config()
const mongoose = require('mongoose')
const { registerChecker } = require('./utils/registerUtil')
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const session = require("express-session");
const cookieParser = require('cookie-parser')
const mongoDbSession = require('connect-mongodb-session')(session)
const path = require('path');
const cors = require('cors')
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer')
const multerS3 = require('multer-s3');


const app = express()




const RegisterUser = require('./Schema/RegisterUser')
const { loginUtil } = require('./utils/loginUtil')
const isAuth = require('./authUtils/adminauth')
const FoodProduct = require('./Schema/FoodProduct');
const { fetchRestaurantFood } = require('./utils/fetchRestaurantFood');


// app.use(cors())
app.set('trust proxy', 1); 
app.use(cors({
    origin: ['http://localhost:3000', 'https://front-food-deploy-xi.vercel.app'],
    // origin: ['https://front-food-deploy-xi.vercel.app'],
    credentials: true,
}));

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
const store = new mongoDbSession({
    uri: process.env.MongoLink,
    collection: "sessions",

})


app.use(session({
    store: store,
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        secure: process.env.NODE_ENV === 'production', // Secure true in production
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // None for cross-site in production
        httpOnly: true,
    }
}));


const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Set in your environment variables
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});



const port = process.env.PORT
const mode = process.env.NODE_ENV || "production"






mongoose.connect(process.env.MongoLink)
    .then((res) => {
        console.log('Connected to MongoDB')
    })
    .catch(err => console.err)




app.get("/", (req, res) => {
    res.send('Welcome')
})

app.post('/registerUser', async (req, res) => {
    const { username, name, email, password, contact } = req.body
    // console.log(contact)
    // console.log(req.body)


    try {
        await registerChecker({ username, name, email, password, contact })
        let existingUser = await RegisterUser.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        })
        if (existingUser) {
            return res.send({
                status: 400,
                message: 'User already exists'
            })
        }
    } catch (error) {
        console.log(error)
    }

    let userDb;

    try {
        userDb = new RegisterUser({ username, name, email, password, contact })
        res.status(200).json('successfully registered')
    } catch (error) {
        console.log(error)
    }

    await userDb.save()
})



app.post('/loginUser', async (req, res) => {
    const { username, password } = req.body;
    console.log(username, password)
    try {
        await loginUtil({ username, password })
    } catch (error) {
        console.log(error)
    }

    let findDb;
    try {
        findDb = await RegisterUser.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        })

        if (!findDb) {
            return res.status(404).json({
                status: 404,
                message: 'User not found'
            })
        }
        console.log(findDb)

        return res.send({
            status: 200,
            message: 'Logged in successfully',
            user: findDb
        })

    } catch (error) {
        console.log(error)
    }
})

const adminSchema = new Schema({
    username: String,
    restrauntName: String,
    password: String,
    address: String,
})
const adminModel = mongoose.model('admin', adminSchema)

app.post('/adminRegister', async (req, res) => {

    const { username, password, restrauntName, address } = req.body;


    try {
        const existingAdmin = await adminModel.findOne({ username })

        if (existingAdmin) {
            return res.status(400).json({
                status: 400,
                message: 'Admin already exists'
            })
        }
    } catch (error) {
        res.send({
            status: 500,
            message: 'An error occurred while checking for existing admin'
        })
    }

    try {
        const hashPassword = await bcrypt.hash(password, 10)
        const adminDb = new adminModel({
            username,
            restrauntName,
            address,
            password: hashPassword,
            isAdminAuth: false,
        })

        console.log(adminDb)

        await adminDb.save()
        console.log('Admin registered successfully');
        res.status(201).json({ message: 'Admin registered successfully' });

    } catch (error) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred while registering the admin' });
    }
})


app.post('/registerEmail', (req, res) => {
    const email = req.body.email;
    console.log(email)
})



app.post('/adminDone', async (req, res) => {
    const { username, password } = req.body
    // console.log(req.body)
    // console.log(req.session)

    try {
        let admin = await adminModel.findOne({ username: username });
        if (!admin) return res.status(400).json("User not found, please register first");
        const comparepassword =  bcrypt.compare(password, admin.password); 
        if (!comparepassword) return res.status(400).json("Password does not match");
        let userDetail = {
            name: admin.username,
            restrauntName: admin.restrauntName,
            address: admin.address
        }

        console.log(userDetail)

        res.cookie('userDetails', JSON.stringify(userDetail), {
            maxAge: 900000, // 15 minutes
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });
        
        
        req.session.userDetails = userDetail;

        req.session.save(err => {
            if (err) {
                return res.status(500).json("Session save error");
            }
            res.json({ message: 'Login successful', user: userDetail });
        })



    } catch (error) {
        return res.send({
            status: 500,
            message: "Internal server error",
            error: error,
        });
    }

})

app.get("/seesession", (req, res) => {
    console.log(req.session)
    res.send("seeSession")
})

app.post('/adminLogout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                message: 'Session destroy error'
            });
        } else {
            // Clear the userDetails cookie
            res.clearCookie('userDetails', {
                path: '/', // Ensure the path matches where the cookie was set
                httpOnly: true, // Keep the same attributes as when the cookie was set
                secure: process.env.NODE_ENV === 'production', // Match the original cookie settings
                sameSite: 'None' // Match the original cookie settings if needed
            });

            return res.status(200).send({
                status: 200,
                message: 'Logged out successfully, cookie cleared'
            });
        }
    });
});




const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'))
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME, 
        acl: 'public-read',
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '-' + file.originalname); 
        }
    })
});


// const upload = multer({
//     storage: storage
// }).single('imageTest')


app.post('/uploadData', upload.single('imageTest'), async (req, res) => { 

    const imageUrl = req.file.location; 
    let userDetails = req.cookies.userDetails;
    if (userDetails) {
        try {
            userDetails = JSON.parse(userDetails); 
            console.log(userDetails);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid cookie format' });
        }
    } else {
        return res.status(401).json({ message: 'Unauthorized, cookie not found' });
    }

    if (!req.file) { // Added check for file
        return res.status(400).json({ message: 'File not uploaded' });
    }

    const { name, restrauntName, address } = userDetails;

    try {

        // const imagePath = `uploads/${req.file.filename}`; 
        const itemData = new FoodProduct({
            image: imageUrl,
            category: req.body.category,
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            username: name,
            restrauntName: restrauntName,
            address: address,
        });

        console.log(itemData);

        await itemData.save(); // Added await
        res.status(201).json({ message: 'File uploaded successfully', data: itemData });

    } catch (error) {
        console.error('Error while uploading data:', error); // Enhanced error logging
        res.status(500).json({ message: 'Error while uploading data', error });
    }
});




app.get('/getRestrauntFood',  async (req, res) => {

    // console.log("Session in /getRestrauntFood:", req.cookies.userDetails);
    // console.log(req.session)

    // res.cookie('userDetails', JSON.stringify(userDetail), {
    //     maxAge: 900000, // 15 minutes
    //     httpOnly: true // Accessible only by the web server
    // });



    let userDetails = req.cookies.userDetails;

    if(!userDetails) {
        return res.status(500).json("cookie not found")
    }

    if (userDetails) {
        try {
            userDetails = JSON.parse(userDetails); 
            // console.log(userDetails)
        } catch (error) {
            return res.status(400).json({ message: 'Invalid cookie format' });
        }
    } else {
        return res.status(401).json({ message: 'Unauthorized, cookie not found' });
    }

    
    try {
        const username = userDetails.name;
        // console.log(username)
        if (!username) {
            return res.status(401).json({ message: 'Unauthorized, session not found' });
        }
        const data = await fetchRestaurantFood(username)
        res.json({ data: data, userdetail: userDetails });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching food items', error });
    }

})


app.get('/getProduct', async (req, res) => {
    try {
        const product = await FoodProduct.find();
        res.status(200).json(product)
    } catch (error) {
        res.send({
            status: 404,
            message: 'No product found',
            data: product
        })
    }
})

app.post("/deleteItem", (req, res) => {
    // const authorusername = req.body;
    const { username } = req.body.senderDetail
    const id = req.body.id
    let userDetails = req.cookies.userDetails;

    if (userDetails) {
        try {
            userDetails = JSON.parse(userDetails); 
            console.log(userDetails)
        } catch (error) {
            return res.status(400).json({ message: 'Invalid cookie format' });
        }
    } else {
        return res.status(401).json({ message: 'Unauthorized, cookie not found' });
    }


    // console.log(username)
    if (username !== userDetails.name) {
        return res.status(500).json({ message: "you are not authorised" })
    }
    try {

        FoodProduct.findByIdAndDelete(id)
            .then(() => {
                res.send({ message: 'Item deleted successfully' });
            })
            .catch((error) => {
                console.error('Error while deleting item:', error);
                res.status(500).send('Error while deleting item');
            });

    } catch (error) {
        return res.status(500).json({
            message: "Error " + error
        })
    }
})


app.listen(port, () => {
    console.log(`Starting server on port ${port} in ${mode} mode`)
})
