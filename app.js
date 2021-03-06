const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const graphqlHttp = require('express-graphql');
const imageHelper = require('./helpers/image');
const auth = require('./middleware/auth');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const app = express();
 
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images');
    },
    filename: function(req, file, cb) {
        cb(null, uuidv4() + '-' + file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    if(file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

// parse body to JSON
app.use(bodyParser.json());
// parse files in requests
app.use(multer({storage, fileFilter}).single('image'));
//set static url
app.use('/images', express.static(path.join(__dirname, 'images')));

// add CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not authenticated!');
    }
    if (!req.file) {
        return res.status(200).json({message: 'No file provided!'});
    }

    if (req.body.oldPath) {
        imageHelper.clearImage(req.body.oldPath)
    }

    return res.status(201).json({message: 'File stored', filePath: req.file.path});
});

app.use('/graphql', graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err;
        }
        const {data, code} = err.originalError;
        const message = err.message || 'An error has occurred!';
        console.log({
            err,
            data,
            status: code,
            message
        });
        return {
            data,
            status: code,
            message
        };
    }
}));
// error router
app.use((error, req, res, next)=> {
    console.log('\x1b[31m', error);
    res.status(error.statusCode || 500)
        .json({
            message: error.message
        });
});
// connnect to DB
mongoose
    .connect('mongodb://localhost:27017/NodeRestServer')
    .then(result => {
        app.listen(8080);
    })
    .catch(err => console.trace(err));