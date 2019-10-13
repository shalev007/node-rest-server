const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');
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

    next();
});

// list routes
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

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
        const server = app.listen(8080);
        const io = require('./socket').init(server);
        io.on('connection', socket => {
            console.log('client connected');
        });
    })
    .catch(err => console.trace(err));